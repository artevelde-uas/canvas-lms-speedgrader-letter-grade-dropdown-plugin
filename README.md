# Canvas LMS Speedgrader Letter Grade Dropdown Plug-in

Plugin for the [Canvas LMS theme app](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-app) that
adds a convenient dropdown list to the speedgrader when using letter grades.

[![](https://img.shields.io/npm/v/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin)
[![](https://img.shields.io/github/license/artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://spdx.org/licenses/ISC)
[![](https://img.shields.io/npm/dt/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-speedgrader-letter-grade-dropdown-plugin)

## Features

The following configurable options are available:

- Whether the selectbox should remain open while focussed.
- Whether the selectbox should adapt its size to fit all options.
- Allows to type just the letter shortcut if the options contain extra text (e.g. 'X (Some description)').

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

addPlugin(speedgraderLetterGradeDropdownPlugin, {
    alwaysOpenOnFocus: true,
    fitOptions: true,
    letterShortcut: true,
    letterRegexp: /(?<letter>\w+) \(.+\)/
});

run();
```

### Options

|        Name           |    Type     | Default                   | Description                                                          |
| :-------------------: | :---------: | :-----------------------: | :------------------------------------------------------------------- |
| **alwaysOpenOnFocus** | `{Boolean}` | `false`                   | Sets whether the selectbox should remain open while focussed.        |
| **fitOptions**        | `{Boolean}` | `false`                   | Sets whether the selectbox should adapt its size to fit all options. |
| **letterShortcut**    | `{Boolean}` | `false`                   | Sets whether to use letter shortcuts.                                |
| **letterRegexp**      | `{RegExp}`  | `/(?<letter>\w+) \(.+\)/` | The regular expression to use for letter shortcuts.                  |

#### `letterRegexp`

Any regular expression containing a named capture group called '`letter`'

**Examples:**

- Grading scheme in the format *'X (Descripton)'*: `/(?<letter>\w+) \(.+\)/`
- Grading scheme in the format *'Descripton (X)'*: `/.+ \((?<letter>\w+)\)/`
