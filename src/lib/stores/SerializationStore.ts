import { writable } from 'svelte/store';

import type { FixMe } from '$lib/types/fixme';
import { HistoryStore } from '$lib/stores/HistoryStore';
import type { HistoryStoreState } from '$lib/stores/HistoryStore';
import { MUTATIONS } from '$lib/stores/HistoryStore';

export type SerializationStoreState = {
  attachedFile: {
    enabled: boolean;
    handle: FileSystemFileHandle;
    mode: 'read' | 'readwrite';
    file: File;
    lastModified: number;
    lastModifiedIntervalId: number;
    syncing: boolean;
    saveOnReEnable: boolean;
  } | null;
};

export const SerializationStore = {
  ...writable<SerializationStoreState>({ attachedFile: null }),

  async attachFile(passedFileHandle: FileSystemFileHandle | null = null) {
    // ref: https://web.dev/file-system-access/
    let fileHandle: FileSystemFileHandle;
    if (passedFileHandle) {
      fileHandle = passedFileHandle;
    } else {
      const results: [ FileSystemFileHandle ] = await (window as FixMe).showOpenFilePicker();
      fileHandle = results[0];
    }

    const file = await fileHandle.getFile();

    // Every second, check to see if the file has changed, and if so, re-load it
    const lastModifiedIntervalId = window.setInterval(async () => {
      let newFile: File;
      try {
        newFile = await fileHandle.getFile();
      } catch (err) {
        console.warn('Connection to file lost:', err);
        // The file could not be opened, so reset
        SerializationStore.detachFile();
        return;
      }

      SerializationStore.update(value => {
        // If the file entry goes away, cancel this interval
        if (!value.attachedFile) {
          clearInterval(lastModifiedIntervalId);
          return value;
        }

        if (!value.attachedFile.enabled) {
          return value;
        }

        if (value.attachedFile.lastModified === newFile.lastModified) {
          return value;
        }

        return {
          ...value,
          attachedFile: {
            ...value.attachedFile,
            lastModified: newFile.lastModified,
            file: newFile,
          },
        };
      });
    }, 1000);

    SerializationStore.update(value => ({
      ...value,
      attachedFile: {
        enabled: true,
        handle: fileHandle,
        mode: 'read',
        file,
        lastModified: file.lastModified,
        lastModifiedIntervalId,
        syncing: false,
        saveOnReEnable: false,
      },
    }));
  },

  async attachNewFile() {
    // ref: https://web.dev/file-system-access/
    const options = {
      types: [
        {
          description: 'Saved File',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
    };
    const result: FileSystemFileHandle = await (window as FixMe).showSaveFilePicker(options);

    return SerializationStore.attachFile(result);
  },

  detachFile() {
    return SerializationStore.update(value => {
      // Clear the interval if the background last modified task is still running
      if (value.attachedFile) {
        clearInterval(value.attachedFile.lastModifiedIntervalId);
      }
      return { ...value, attachedFile: null };
    });
  },

  async toggleFileEnabled(value: SerializationStoreState, historyValue: HistoryStoreState) {
    let shouldSave = false;
    let newValue = value;

    SerializationStore.update(value => {
      if (!value.attachedFile) {
        return value;
      }

      const enabled = !value.attachedFile.enabled;

      shouldSave = enabled && value.attachedFile.saveOnReEnable;

      newValue = {
        ...value,
        attachedFile: {
          ...value.attachedFile,
          enabled,
          saveOnReEnable: false,
        },
      };
      return newValue;
    });

    if (shouldSave) {
      await SerializationStore.serialize(newValue, historyValue);
    }
  },

  async serialize(value: SerializationStoreState, historyValue: HistoryStoreState) {
    // Ensure that only one write happens at once
    if (value?.attachedFile?.syncing) {
      return;
    }

    // If the file is not enabled, then save once it is re-enabled
    if (!value?.attachedFile?.enabled) {
      SerializationStore.update(value => {
        if (!value.attachedFile) {
          return value;
        }
        return { ...value, attachedFile: { ...value.attachedFile, saveOnReEnable: true }};
      });
      return;
    }

    const serialized = {
      version: 1,
      index: historyValue.currentHistoryIndex,
      log: historyValue.history.map(historyListItem => ({
        type: historyListItem.type,
        args: historyListItem.args,
        context: historyListItem.context,
      })),
    };

    await SerializationStore.writeToFile(async fileHandle => {
      const writable = await (fileHandle as FixMe).createWritable();
      await writable.write(JSON.stringify(serialized, null, 2));
      await writable.close();
    });

    // Reset saveOnReEnable after saving
    if (!value?.attachedFile?.saveOnReEnable) {
      SerializationStore.update(value => {
        if (!value.attachedFile) {
          return value;
        }
        return { ...value, attachedFile: { ...value.attachedFile, saveOnReEnable: false }};
      });
    }
  },

  async deserialize() {
    // Turn on "syncing" indicator
    let fileHandle: FileSystemFileHandle | null = null;
    SerializationStore.update(value => {
      if (!value.attachedFile) {
        return value;
      }
      if (!value.attachedFile.enabled) {
        return value;
      }

      fileHandle = value.attachedFile.handle;
      return { ...value, attachedFile: { ...value.attachedFile, syncing: true }};
    });
    if (!fileHandle) {
      return;
    }

    const file = await fileHandle.getFile();
    const rawContents = await file.text();

    let deserialized: FixMe;
    try {
      deserialized = JSON.parse(rawContents);
    } catch (err) {
      console.warn('Error: unable to deserialize file', err);
      SerializationStore.detachFile();
      return;
    }

    if (deserialized.version > 1) {
      console.warn('Error: file version is too new, got ${deserialized.version}, expected 1!');
      SerializationStore.detachFile();
      return;
    }

    // Go back to the beginning
    HistoryStore.to(0);

    // Clear out the store
    HistoryStore.set({
      history: [],
      currentHistoryIndex: -1,
      undoneHistoryItems: [],
    });

    // Apply all mutations on top
    for (const logItem of deserialized.log) {
      MUTATIONS[logItem.type](logItem.args, logItem.context);
    }

    // Then finally add in the extra metadata
    HistoryStore.update(value => ({
      ...value,
      currentHistoryIndex: deserialized.index,
    }));

    // Reset syncing to false
    SerializationStore.update(value => {
      if (!value.attachedFile) {
        return value;
      }
      return {
        ...value,
        attachedFile: {
          ...value.attachedFile,
          lastModified: file.lastModified,
          syncing: false,
        },
      };
    });
  },

  async writeToFile(callback: (handle: FileSystemFileHandle) => Promise<void>) {
    // Turn on "syncing" indicator
    let fileHandle: FileSystemFileHandle | null = null;
    SerializationStore.update(value => {
      if (!value.attachedFile) {
        return value;
      }
      if (!value.attachedFile.enabled) {
        return value;
      }

      fileHandle = value.attachedFile.handle;
      return { ...value, attachedFile: { ...value.attachedFile, syncing: true }};
    });
    if (!fileHandle) {
      return;
    }

    const reset = (file?: File) => {
      // Reset syncing to false
      SerializationStore.update(value => {
        if (!value.attachedFile) {
          return value;
        }
        return {
          ...value,
          attachedFile: {
            ...value.attachedFile,
            lastModified: file ? file.lastModified : value.attachedFile.lastModified,
            syncing: false,
          },
        };
      });
    }

    // Make we can read and write to the file
    const opts = { mode: 'readwrite' };
    if (await (fileHandle as FixMe).queryPermission(opts) !== 'granted') {
      if (await (fileHandle as FixMe).requestPermission(opts) !== 'granted') {
        reset();
        return;
      }
    }

    await callback(fileHandle);

    const file = fileHandle ? await fileHandle.getFile() : undefined;
    reset(file);
  }
};
