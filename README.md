# ClothCAD
An experiment in trying to build a cad program from scratch that is optimized around making things out of flexible materials

## Getting Started

```bash
$ # Install dependencies
$ npm install
$
$ # Start
$ npm run dev
$ # or start the server and open the app in a new browser tab
$ npm run dev -- --open
```

## High level overview

The easiest way to get started is to use the built in sample drawing:
<img width="1510" alt="Screenshot 2024-05-23 at 8 16 55 AM" src="https://github.com/rgaus/clothcad/assets/1704236/fc37a908-bdec-4f87-9a29-faeff21078f1">

Note that for an actual project, one would click upload and upload multiple different svgs.

Once a drawing is uploaded, it needs to be converted to surfaces and folds. Right now, that involves targeting elements within the svg. Here's an example of that with the sample drawing:
<img width="1509" alt="Screenshot 2024-05-23 at 8 07 04 AM" src="https://github.com/rgaus/clothcad/assets/1704236/92db8611-76e0-44f7-a439-ba0eaa74c7fc">

Once created, one can perform actions on each surface / fold entity. Right now, there are two things one can do. First, you'll likely want to split / bisect a surface at a fold so that you can actually perform the fold. 

Here's where that action is located:
<img width="1510" alt="Screenshot 2024-05-23 at 8 10 08 AM" src="https://github.com/rgaus/clothcad/assets/1704236/fdbc2acf-0362-4b00-a39d-83e26edf9b21">

And here's what it looks like after being split (for example):
<img width="1512" alt="Screenshot 2024-05-23 at 8 10 52 AM" src="https://github.com/rgaus/clothcad/assets/1704236/3e37fd6d-880c-4bb1-a8ad-c236f552ef22">

Finally, you'll likely want to perform an actual fold. Here's an example of what that could look like after performing the fold:
<img width="659" alt="Screenshot 2024-05-23 at 8 13 54 AM" src="https://github.com/rgaus/clothcad/assets/1704236/b24ca874-19f7-4f0c-b68b-82151f634151">

Also - the current leg of the "commit graph" can be viewed in the history panel, which allows one to do cad like things like make changes to earlier steps and have future steps rebase on top automatically.

## Future ideas
- Right now, everything is perfectly planar with exact creased paper-like folds. Materials need to have thickness - I've already started thinking about that a little bit, but the current implementation doesn't handle rounded corners properly.
- Some kind of clash detection
- A 180 degree fold to finish an edge doesn't really work because part of a surface ends up inside itself. "thickness" needs to be taken into account with obtuse angle folds properly.
- Somehow it would be good to be able to illustrate a sewing machine "stitch", and then with this it would probably be trivial to make lego digital designer esque tutorials to make a thing
