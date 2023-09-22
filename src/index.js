import { router, dom, api, ui } from '@artevelde-uas/canvas-lms-app';

import t from './i18n';
import { parseLocaleNumber } from './util';

import styles from './index.module.css';


async function getGradingStandard(courseId, assignmentId) {
    const assignment = await api.get(`/courses/${courseId}/assignments/${assignmentId}`);
    const gradingStandard = await api
        .get(`/courses/${courseId}/grading_standards/${assignment.grading_standard_id}`)
        .catch(error => null);

    // The grading standard is defined within the course itself
    if (gradingStandard !== null && gradingStandard.errors === undefined) {
        return gradingStandard;
    }

    // Get the course's account ID
    const course = await api.get(`/courses/${courseId}`);
    let accountId = course.account_id;

    // Loop over the account hierarchy until the grading standard is found
    do {
        const gradingStandard = await api
            .get(`/accounts/${accountId}/grading_standards/${assignment.grading_standard_id}`)
            .catch(error => null);

        // Grading standard found!
        if (gradingStandard !== null && gradingStandard.errors === undefined) {
            return gradingStandard;
        }

        const account = await api.get(`/accounts/${accountId}`);

        accountId = account.parent_account_id;
    } while (accountId !== null);

    // Return NULL if no grading standard is found
    return null;
}

export default function ({
    alwaysOpenOnFocus = false,
    fitOptions = false,
    letterShortcut = false,
    letterRegexp = /^\s*(.+) \(.+\)\s*$/
}) {
    router.onRoute(['courses.gradebook.speedgrader', 'courses.gradebook.speedgrader.student'], async ({ courseId, assignmentId }) => {
        const gradingStandard = await getGradingStandard(courseId, assignmentId);

        // Stop if no grading scheme found
        if (gradingStandard === null) {
            console.error('Grading scheme not found');

            return;
        }

        // Wait for the grading box element to appear
        const gradingBox = await dom.onElementReady('#grading-box-extended');

        // Inject a select box after the grade input
        gradingBox.insertAdjacentHTML('afterend', `
            <select multiple>
                ${gradingStandard.grading_scheme.map(({ name }) => `
                    <option value="${name}">${name}</option>
                `).join('\n')}
            </select>
        `);

        const gradingWrapper = document.createElement('div');
        const gradingLabel = gradingBox.parentElement;
        const gradingSelect = gradingBox.nextElementSibling;
        const gradingOptions = Array.from(gradingSelect.options);

        // Create the grading info icon which opens a modal pop-up
        const infoButton = ui.createQuestionIcon(`
            <div class="${styles.infoContent}">
                <table class="${styles.infoKeys}">
                    <caption class="screenreader-only">${t('info.title')}</caption>
                    <thead>
                        <tr>
                            <th class="screenreader-only">${t('info.shortcut')}</th>
                            <th class="screenreader-only">${t('info.omschrijving')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <kbd><i class="icon-arrow-up">${t('info.keys.up')}</i></kbd> /
                                <kbd><i class="icon-arrow-down">${t('info.keys.down')}</i></kbd>
                            </td>
                            <td>${t('info.descriptions.up-down')}</td>
                        </tr>
                        <tr>
                            <td><kbd>Enter</kdb></td>
                            <td>${t('info.descriptions.enter')}</td>
                        </tr>
                        <tr>
                            <td><kbd>Del</kbd></td>
                            <td>${t('info.descriptions.delete')}</td>
                        </tr>
                        ${alwaysOpenOnFocus ? '' : `
                            <tr>
                                <td><kbd>Alt</kbd> + <kbd><i class="icon-arrow-down">${t('info.keys.down')}</i></kbd></td>
                                <td>${t('info.descriptions.alt-down')}</td>
                            </tr>
                            <tr>
                                <td><kbd>Esc</kbd></td>
                                <td>${t('info.descriptions.escape')}</td>
                            </tr>
                        `}
                    </tbody>
                </table>
                ${letterShortcut ? `
                    <p>
                        ${t('info.use_letter_shortcuts')}
                    </p>
                ` : ''}
            </div>
        `, {
            title: t('info.title'),
            minheigth: 300,
            minWidth: 600,
            resizable: false
        });

        // Put all drop-down elements inside a wrapper element
        gradingBox.before(gradingWrapper);
        gradingWrapper.append(gradingBox, gradingSelect, infoButton);

        // Set styles
        gradingLabel.classList.add(styles.gradingLabel);
        gradingWrapper.classList.add(styles.gradingWrapper);
        gradingBox.classList.add(styles.gradingBox);
        gradingSelect.classList.add(styles.gradingSelect);
        infoButton.classList.add(styles.infoButton);

        // Find the option that matches the current grading box value
        function getMatchedOption() {
            return gradingOptions.find(option => option.value === gradingBox.value);
        }

        // Select the current option on page load
        selectCurrentOption: {
            const matchedOption = getMatchedOption();

            // Stop if no match found
            if (matchedOption === undefined) break selectCurrentOption;

            matchedOption.selected = true;
        }

        // Set focus to the grading box on page load
        gradingBox.focus();

        // Set matching option on each grade change
        gradingBox.addEventListener('change', event => {
            const selectedOption = gradingOptions.find(option => option.selected === true);
            const matchedOption = getMatchedOption();

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
            gradingBox.value = event.target.value;
            gradingBox.dispatchEvent(new Event('change'));
        });

        function up() {
            // Find currently selected option
            const selectedOption = getMatchedOption();

            // Only if selection is not first option
            if (selectedOption === undefined || selectedOption === gradingSelect.firstElementChild) return;

            // Move selection up and set grading value
            selectedOption.selected = false;
            selectedOption.previousElementSibling.selected = true;
            gradingBox.value = selectedOption.previousElementSibling.value;
        }

        function down() {
            // Find currently selected option
            const selectedOption = getMatchedOption();

            // Only if selection is not last option
            if (selectedOption === gradingSelect.lastElementChild) return;

            // If no option is selected, select first one
            if (selectedOption === undefined) {
                gradingSelect.firstElementChild.selected = true;
                gradingBox.value = gradingSelect.firstElementChild.value;
            } else {
                // Move selection down and set grading value
                selectedOption.selected = false;
                selectedOption.nextElementSibling.selected = true;
                gradingBox.value = selectedOption.nextElementSibling.value;
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
            gradingBox.value = '';
        }

        function handleWheel(event) {
            // Prevent page scroll
            event.preventDefault();

            gradingBox.focus();

            if (event.deltaY < 0) {
                up();
            } else {
                down();
            }
        }

        // Handle mousewheel events
        gradingBox.addEventListener('wheel', handleWheel);
        gradingSelect.addEventListener('wheel', handleWheel);

        // Handle <Up> and <Down> key presses
        gradingBox.addEventListener('keydown', event => {
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

        // Set correct grading based on current input
        function setGradingBoxValue() {
            // Create accent- and case-insensitive collater
            const collator = new Intl.Collator([], { usage: 'search', sensitivity: 'base' });
            // Find option based on letter matching regexp if set
            const predicate = letterShortcut
                ? ({ value }) => (value
                    .match(letterRegexp)
                    .filter((value, index) => (index > 0 && typeof value === 'string'))
                    .some(value => (collator.compare(value, gradingBox.value) === 0)))
                : ({ value }) => (collator.compare(value, gradingBox.value) === 0);
            const option = gradingOptions.find(predicate);

            // Stop if no option is found
            if (option === undefined) return;

            gradingBox.value = option.value;
        }

        const gradingBoxPointsPossible = document.getElementById('grading-box-points-possible');
        const gradingBoxCurrentScore = gradingBoxPointsPossible.querySelector('.score');
        const pointPossibleRegex = /\(\s*\S+\s*\/\s*(?<pointsPossible>\S+)\s*\)/;
        const pointPossibleString = gradingBoxPointsPossible.textContent.match(pointPossibleRegex)?.groups.pointsPossible;
        const pointPossible = parseLocaleNumber(pointPossibleString);

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

        // Set correct grading when <Enter> key is pressed
        gradingBox.addEventListener('keypress', event => {
            if (event.key !== 'Enter') return;

            const currentScore = parseLocaleNumber(gradingBoxCurrentScore.textContent);

            // Stop if the current score falls within the boundaries of the currently selected letter grade
            if (gradingBox.value === findLetterGradeByPoints(currentScore)) return;

            // Set value of grading box based on letter matcher
            setGradingBoxValue();

            // Manually trigger a change event
            gradingBox.dispatchEvent(new Event('change'));
        });

        // Set correct grading when the drop-down loses focus
        gradingBox.addEventListener('blur', event => {
            const currentScore = parseLocaleNumber(gradingBoxCurrentScore.textContent);

            // Stop if the current score falls within the boundaries of the currently selected letter grade
            if (gradingBox.value === findLetterGradeByPoints(currentScore)) return;

            // Set value of grading box based on letter matcher
            setGradingBoxValue();

            // Manually trigger a change event
            gradingBox.dispatchEvent(new Event('change'));
        });

        // Expand select to encompass all options
        if (fitOptions) {
            const height = gradingSelect.scrollHeight + (gradingSelect.offsetHeight - gradingSelect.clientHeight);

            gradingSelect.classList.add(styles.fitOptions);
            gradingSelect.style.height = `${height}px`;
        }

        if (alwaysOpenOnFocus) {
            gradingBox.classList.add(styles.alwaysOpenOnFocus);
        } else {
            // Toggle drop-down 'open' state on click
            gradingBox.addEventListener('click', event => {
                gradingSelect.classList.toggle(styles.open);
            });

            // Close drop-down when element loses focus
            gradingBox.addEventListener('blur', event => {
                gradingSelect.classList.remove(styles.open);
            });

            // Close drop-down when an option is clicked
            gradingSelect.addEventListener('click', event => {
                // Only handle event if an option is clicked with the left mouse button
                if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

                gradingSelect.classList.remove(styles.open);
            });

            // Close drop-down when <Enter> key is pressed
            gradingBox.addEventListener('keypress', event => {
                if (event.key !== 'Enter') return;

                gradingSelect.classList.remove(styles.open);
            });

            gradingBox.addEventListener('keydown', event => {
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
    });

    return {
        ...require('../package.json'),
        title: t('package.title'),
        description: t('package.description')
    };
}
