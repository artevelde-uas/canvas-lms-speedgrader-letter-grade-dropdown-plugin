# Canvas LMS Speedgrader Letter Grade Dropdown Plug-in

Plugin for the [Canvas LMS theme app](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-app) that
adds a convenient dropdown list to the speedgrader when using letter grades.

[![](https://img.shields.io/npm/v/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin)
[![](https://img.shields.io/github/license/artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://spdx.org/licenses/ISC)
[![](https://img.shields.io/npm/dt/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin)

## Installation

Using NPM:

    npm install @artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin

Using Yarn:

    yarn add @artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin

## Usage

Just import the plug-in and add it to the Canvas app:

```javascript
import { run, addPlugin } from '@artevelde-uas/canvas-lms-app';
import speedgraderLetterGradeDropdownPlugin from '@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin';

addPlugin(speedgraderLetterGradeDropdownPlugin);

run();
```
