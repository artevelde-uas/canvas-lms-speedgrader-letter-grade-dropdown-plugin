import { ui } from '@artevelde-uas/canvas-lms-app';

import t from '../i18n';
import { parseLocaleNumber } from '../util';

import styles from './index.module.css';


export default async function (
    gradingInput,
    gradingStandard,
    {
        alwaysOpenOnFocus = false,
        fitOptions = false,
        letterShortcut = false,
        letterRegexp = /^\s*(.+) \(.+\)\s*$/
    }
) {
    const gradingWrapper = gradingInput.closest('[class*="-formFieldLayout__children"]');
    const flexWrapper = gradingInput.closest('[class*="-view--flex-flex"]');
    const inlineBlockWrapper = flexWrapper.closest('[class*="-view--inlineBlock"]');

    // Inject a select box after the grading input
    gradingWrapper.insertAdjacentHTML('beforeend', `
            <select multiple>
                ${gradingStandard.grading_scheme.map(({ name }) => `
                    <option value="${name}">${name}</option>
                `).join('\n')}
            </select>
        `);

    const gradingSelect = gradingWrapper.lastElementChild;
    const gradingOptions = Array.from(gradingSelect.options);

    // Set styles
    inlineBlockWrapper.classList.add(styles.inlineBlockWrapper);
    flexWrapper.classList.add(styles.flexWrapper);
    gradingWrapper.classList.add(styles.gradingWrapper);
    gradingInput.classList.add(styles.gradingInput);
    gradingSelect.classList.add(styles.gradingSelect);

    // Find the option that matches the current grading box value
    function getMatchedOption() {
        return gradingOptions.find(option => option.value === gradingInput.value);
    }

    // Select the current option on page load
    selectCurrentOption: {
        const matchedOption = getMatchedOption();

        // Stop if no match found
        if (matchedOption === undefined) break selectCurrentOption;

        matchedOption.selected = true;
    }

    // Set matching option on each grade change
    gradingInput.addEventListener('change', event => {
        const selectedOption = gradingOptions.find(option => option.selected === true);
        const matchedOption = getMatchedOption();

        // console.log('change', event.target.value);
        // console.log('selectedOption', selectedOption);
        // console.log('matchedOption', matchedOption);

        // Unselect previous value
        if (selectedOption !== undefined) {
            selectedOption.selected = false;
        }

        // Select current value
        if (matchedOption !== undefined) {
            matchedOption.selected = true;
        }
    });

    // Set correct value on each option click
    gradingSelect.addEventListener('mousedown', event => {
        // Prevent click event to bubble op to the label
        event.preventDefault();

        // Only handle event if an option is pressed with the left mouse button
        if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

        // Set the value and trigger a change event
        gradingInput.value = event.target.value;
        gradingInput.dispatchEvent(new Event('change'));
    });

    function up() {
        // Find currently selected option
        const selectedOption = getMatchedOption();

        // Only if selection is not first option
        if (selectedOption === undefined || selectedOption === gradingSelect.firstElementChild) return;

        // Move selection up and set grading value
        selectedOption.selected = false;
        selectedOption.previousElementSibling.selected = true;
        gradingInput.value = selectedOption.previousElementSibling.value;
    }

    function down() {
        // Find currently selected option
        const selectedOption = getMatchedOption();

        // Only if selection is not last option
        if (selectedOption === gradingSelect.lastElementChild) return;

        // If no option is selected, select first one
        if (selectedOption === undefined) {
            gradingSelect.firstElementChild.selected = true;
            gradingInput.value = gradingSelect.firstElementChild.value;
        } else {
            // Move selection down and set grading value
            selectedOption.selected = false;
            selectedOption.nextElementSibling.selected = true;
            gradingInput.value = selectedOption.nextElementSibling.value;
        }
    }

    function clear() {
        // Find currently selected option
        const selectedOption = getMatchedOption();

        // Clear selection if found
        if (selectedOption !== undefined) {
            selectedOption.selected = false;
        }

        // Reset grading value
        gradingInput.value = '';
    }

    function handleWheel(event) {
        // Prevent page scroll
        event.preventDefault();

        gradingInput.focus();

        if (event.deltaY < 0) {
            up();
        } else {
            down();
        }
    }

    // Handle mousewheel events
    gradingInput.addEventListener('wheel', handleWheel);
    gradingSelect.addEventListener('wheel', handleWheel);

    // Handle <Up> and <Down> key presses
    gradingInput.addEventListener('keydown', event => {
        switch (event.key) {
            case 'ArrowUp':
                up();
                break;
            case 'ArrowDown':
                down();
                break;
            case 'Delete':
                clear();
                break;
        }
    });

    // Expand select to encompass all options
    if (fitOptions) {
        const height = gradingSelect.scrollHeight + (gradingSelect.offsetHeight - gradingSelect.clientHeight);

        gradingSelect.classList.add(styles.fitOptions);
        gradingSelect.style.height = `${height}px`;
    }

    // Set the select box to be always open on focus if set in options
    if (alwaysOpenOnFocus) {
        gradingInput.classList.add(styles.alwaysOpenOnFocus);
    } else {
        // Toggle drop-down 'open' state on click
        gradingInput.addEventListener('click', event => {
            gradingSelect.classList.toggle(styles.open);
        });

        // Close drop-down when element loses focus
        gradingInput.addEventListener('blur', event => {
            gradingSelect.classList.remove(styles.open);
        });

        // Close drop-down when an option is clicked
        gradingSelect.addEventListener('click', event => {
            // Only handle event if an option is clicked with the left mouse button
            if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

            gradingSelect.classList.remove(styles.open);
        });

        // Close drop-down when <Enter> key is pressed
        gradingInput.addEventListener('keypress', event => {
            if (event.key !== 'Enter') return;

            gradingSelect.classList.remove(styles.open);
        });

        gradingInput.addEventListener('keydown', event => {
            // Close drop-down when <Esc> key is pressed
            if (event.key === 'Escape') {
                gradingSelect.classList.remove(styles.open);
            }

            // Open drop-down when <Alt>+<Down> key is pressed
            if (event.key === 'ArrowDown' && event.altKey) {
                gradingSelect.classList.add(styles.open);
            }
        });
    }

    const gradeText = flexWrapper.querySelector('[data-testid="grade-text"]');
    const gradeRegex = /\(\s*(?<currentScore>\S+)?\s*\/\s*(?<pointsPossible>\S+)\s*\)/;
    const gradeString = gradeText.textContent.match(gradeRegex)?.groups.pointsPossible;
    const pointPossible = parseLocaleNumber(gradeString);

    function getCurrentScore() {
        const currentScore = gradeText.textContent.match(gradeRegex)?.groups.currentScore;

        return parseLocaleNumber(currentScore);
    }

    function findLetterGradeByPoints(points) {
        // Only handle actual numbers
        if (!Number.isFinite(points)) return;

        // Search the grading scheme starting with the lowest value
        return gradingStandard.grading_scheme.findLast((element, index, array) => (
            // First letter grade reached so it must be this one
            (index === 0) ||
            // Letter grade found if points are below threshold
            (points < (array[index - 1].value * pointPossible))
        ))?.name;
    }

    // Set correct grading based on current input
    function setGradingBoxValue() {
        // Create accent- and case-insensitive collater
        const collator = new Intl.Collator([], { usage: 'search', sensitivity: 'base' });
        // Find option based on letter matching regexp if set
        const predicate = letterShortcut
            ? ({ value }) => (value
                .match(letterRegexp)
                .filter((value, index) => (index > 0 && typeof value === 'string'))
                .some(value => (collator.compare(value, gradingInput.value) === 0)))
            : ({ value }) => (collator.compare(value, gradingInput.value) === 0);
        const option = gradingOptions.find(predicate);

        // gradingOptions.forEach(({ value }) => {
        //     const match = value.match(letterRegexp);

        //     console.log('match', match);
        // });

        // console.log('option', option);

        // Stop if no option is found
        if (option === undefined) return;

        gradingInput.value = option.value;

        // console.log('option.value', option.value);
        // console.log('gradingInput.value', gradingInput.value);

    }

    // Set correct grading when <Enter> key is pressed
    gradingInput.addEventListener('keypress', event => {
        if (event.key !== 'Enter') return;

        const currentScore = getCurrentScore();

        // console.log('currentScore', currentScore);
        // console.log('gradingInput.value', gradingInput.value);
        // console.log('findLetterGradeByPoints(currentScore)', findLetterGradeByPoints(currentScore));

        // Stop if the current score falls within the boundaries of the currently selected letter grade
        if (gradingInput.value === findLetterGradeByPoints(currentScore)) return;

        // Set value of grading box based on letter matcher
        setGradingBoxValue();

        // Manually trigger a change event
        gradingInput.dispatchEvent(new Event('change'));
        gradingInput.dispatchEvent(new Event('input'));
    });

    // Set correct grading when the drop-down loses focus
    gradingInput.addEventListener('blur', event => {
        const currentScore = getCurrentScore();

        // Stop if the current score falls within the boundaries of the currently selected letter grade
        if (gradingInput.value === findLetterGradeByPoints(currentScore)) return;

        // Set value of grading box based on letter matcher
        setGradingBoxValue();

        // Manually trigger a change event
        gradingInput.dispatchEvent(new Event('change'));
        gradingInput.dispatchEvent(new Event('input'));
    });

    // gradingInput.addEventListener('change', event => {
    //     console.log('change', event);

    //     // const inputEvent = new InputEvent('input', {
    //     //     inputType: 'insertText',
    //     //     data: 'x'
    //     // });

    //     // gradingInput.dispatchEvent(inputEvent);



    //     gradingInput.dispatchEvent(new KeyboardEvent('keypress', { code: 'KeyX' }));
    //     // gradingInput.dispatchEvent(new KeyboardEvent('keypress', { code: 'KeyX' }));



    //     // gradingInput.dispatchEvent(new Event('input'));
    // });

    // gradingInput.addEventListener('input', event => {
    //     console.log('input', event);
    // });

    // // Create the grading info icon which opens a modal pop-up
    // const infoButton = ui.createQuestionIcon(`
    //         <div class="${styles.infoContent}">
    //             <table class="${styles.infoKeys}">
    //                 <caption class="screenreader-only">${t('info.title')}</caption>
    //                 <thead>
    //                     <tr>
    //                         <th class="screenreader-only">${t('info.shortcut')}</th>
    //                         <th class="screenreader-only">${t('info.omschrijving')}</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     <tr>
    //                         <td>
    //                             <kbd><i class="icon-arrow-up">${t('info.keys.up')}</i></kbd> /
    //                             <kbd><i class="icon-arrow-down">${t('info.keys.down')}</i></kbd>
    //                         </td>
    //                         <td>${t('info.descriptions.up-down')}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><kbd>Enter</kdb></td>
    //                         <td>${t('info.descriptions.enter')}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><kbd>Del</kbd></td>
    //                         <td>${t('info.descriptions.delete')}</td>
    //                     </tr>
    //                     ${alwaysOpenOnFocus ? '' : `
    //                         <tr>
    //                             <td><kbd>Alt</kbd> + <kbd><i class="icon-arrow-down">${t('info.keys.down')}</i></kbd></td>
    //                             <td>${t('info.descriptions.alt-down')}</td>
    //                         </tr>
    //                         <tr>
    //                             <td><kbd>Esc</kbd></td>
    //                             <td>${t('info.descriptions.escape')}</td>
    //                         </tr>
    //                     `}
    //                 </tbody>
    //             </table>
    //             ${letterShortcut ? `
    //                 <p>
    //                     ${t('info.use_letter_shortcuts')}
    //                 </p>
    //             ` : ''}
    //         </div>
    //     `, {
    //     title: t('info.title'),
    //     minheigth: 300,
    //     minWidth: 600,
    //     resizable: false
    // });

    // // Set focus to the grading box on page load
    // gradingInput.focus();

    return {
        ...require('../../package.json'),
        title: t('package.title'),
        description: t('package.description')
    };
}
