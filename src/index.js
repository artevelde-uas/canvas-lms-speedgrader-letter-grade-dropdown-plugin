import { router, dom, api, ui } from '@artevelde-uas/canvas-lms-app';

import t from './i18n';

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

        if (gradingStandard === null) {
            console.error('Grading scheme not found');

            return;
        }

        const gradingBox = await dom.onElementReady('#grading-box-extended');

        const infoButton = ui.createQuestionIcon(`
            <div class="${styles.infoContent}">
                <table class="${styles.infoKeys}">
                    <caption class="screenreader-only">Keyboard shortcuts</caption>
                    <thead>
                        <tr>
                            <th class="screenreader-only">Shortcut</th>
                            <th class="screenreader-only">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><kbd><i class="icon-arrow-up">Up</i></kbd> / <kbd><i class="icon-arrow-down">Down</i></kbd></td>
                            <td>Move through the different grading options</td>
                        </tr>
                        <tr>
                            <td><kbd>Enter</kdb></td>
                            <td>Select grading option</td>
                        </tr>
                        <tr>
                            <td><kbd>Del</kbd></td>
                            <td>Clear selection</td>
                        </tr>
                        <tr>
                            <td><kbd>Alt</kbd> + <kbd><i class="icon-arrow-down">Down</i></kbd></td>
                            <td>Open the drop-down menu</td>
                        </tr>
                        <tr>
                            <td><kbd>Esc</kbd></td>
                            <td>Close drop-down</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `, {
            title: 'Keyboard shortcuts',
            minheigth: 300,
            minWidth: 500,
            resizable: false
        });

        // Inject a select box after the grade input
        gradingBox.insertAdjacentHTML('afterend', `
            <select multiple>
                ${gradingStandard.grading_scheme.map(({ name }) => `
                    <option value="${name}">${name}</option>
                `).join('\n')}
            </select>
        `);

        const gradingLabel = gradingBox.parentElement;
        const gradingSelect = gradingBox.nextElementSibling;
        const gradingOptions = Array.from(gradingSelect.options);
        const gradingWrapper = document.createElement('div');

        // Put dropdown inside a wrapper element
        gradingBox.before(gradingWrapper);
        gradingWrapper.append(gradingBox, gradingSelect, infoButton);

        // Set styles
        gradingLabel.classList.add(styles.gradingLabel);
        gradingWrapper.classList.add(styles.gradingWrapper);
        gradingBox.classList.add(styles.gradingBox);
        gradingSelect.classList.add(styles.gradingSelect);
        infoButton.classList.add(styles.infoButton);

        function getMatchedOption() {
            return gradingOptions.find(option => option.value === gradingBox.value);
        }

        const matchedOption = getMatchedOption();

        // Select the current option on page load
        if (matchedOption !== undefined) {
            matchedOption.selected = true;
        }

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

        gradingSelect.addEventListener('mousedown', event => {
            event.preventDefault();

            // Only handle event if an option was pressed with the left mouse button
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

        // Expand select to encompass all options
        if (fitOptions) {
            const height = gradingSelect.scrollHeight + (gradingSelect.offsetHeight - gradingSelect.clientHeight);

            gradingSelect.classList.add(styles.fitOptions);
            gradingSelect.style.height = `${height}px`;
        }

        function setGradingBoxValue() {
            const collator = new Intl.Collator([], { usage: 'search', sensitivity: 'base' });
            // Find option based on letter matching regexp if set
            const predicate = letterShortcut
                ? ({ value }) => (value
                    .match(letterRegexp)
                    .filter((value, index) => (index > 0 && typeof value === 'string'))
                    .some(value => (collator.compare(value, gradingBox.value) === 0)))
                : ({ value }) => (collator.compare(value, gradingBox.value) === 0);
            const option = gradingOptions.find(predicate);

            // Stop if no option was found
            if (option === undefined) return;

            gradingBox.value = option.value;
        }

        gradingBox.addEventListener('keypress', event => {
            // Only handle event if <Enter> or <Tab> key was pressed
            if (!['Enter', 'Tab'].includes(event.key)) return;

            // Set value of grading box based on letter matcher
            setGradingBoxValue();

            // Manually trigger a change event
            event.preventDefault();
            gradingBox.dispatchEvent(new Event('change'));
        });

        gradingBox.addEventListener('blur', event => {
            // Set value of grading box based on letter matcher
            setGradingBoxValue();

            // Manually trigger a change event
            event.preventDefault();
            gradingBox.dispatchEvent(new Event('change'));
        });

        if (alwaysOpenOnFocus) {
            gradingBox.classList.add(styles.alwaysOpenOnFocus);
        } else {
            gradingBox.addEventListener('click', event => {
                gradingSelect.classList.toggle(styles.open);
            });

            gradingBox.addEventListener('blur', event => {
                gradingSelect.classList.remove(styles.open);
            });

            gradingSelect.addEventListener('click', event => {
                // Only handle event if an option was clicked with the left mouse button
                if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

                gradingSelect.classList.remove(styles.open);
            });

            gradingBox.addEventListener('keypress', event => {
                // Only handle event if <Enter> or <Esc> key was pressed
                if (event.key !== 'Enter') return;

                gradingSelect.classList.remove(styles.open);
            });

            gradingBox.addEventListener('keydown', event => {
                // Only handle event if <Esc> key was pressed
                if (event.key === 'Escape') {
                    gradingSelect.classList.remove(styles.open);
                }

                // Only handle event if <Alt> + <Down> key was pressed
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
