import { router, dom, api } from '@artevelde-uas/canvas-lms-app';

import t from './i18n';

import styles from './index.module.css';


async function getGradingStandard(courseId, assignmentId) {
    const assignment = await api.get(`/courses/${courseId}/assignments/${assignmentId}`);
    const gradingStandard = await api
        .get(`/courses/${courseId}/grading_standards/${assignment.grading_standard_id}`)
        .catch(error => null);

    // The grading standard is defined within the course itself
    if (gradingStandard !== null) {
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

        if (gradingStandard !== null) {
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
    letterRegexp = /(?<letter>\w+) \(.+\)/
}) {
    router.onRoute(['courses.gradebook.speedgrader', 'courses.gradebook.speedgrader.student'], async ({ courseId, assignmentId }) => {
        const gradingStandard = await getGradingStandard(courseId, assignmentId);

        if (gradingStandard === null) return;

        const gradingBox = await dom.onElementReady('#grading-box-extended');

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

        gradingLabel.classList.add(styles.gradingLabel);
        gradingBox.classList.add(styles.gradingBox);
        gradingSelect.classList.add(styles.gradingSelect);

        const matchedOption = Array.from(gradingSelect.options).find(option => option.value === gradingBox.value);

        // Select the current option on page load
        if (matchedOption !== undefined) {
            matchedOption.selected = true;
        }

        // Set matching option on each grade change
        gradingBox.addEventListener('change', event => {
            const options = Array.from(gradingSelect.options);
            const selectedOption = options.find(option => option.selected === true);
            const matchedOption = options.find(option => option.value === gradingBox.value);

            if (selectedOption !== undefined) {
                selectedOption.selected = false;
            }

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

        gradingBox.addEventListener('keydown', event => {
            // Only handle event if <Up> or <Down> key were pressed
            if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;

            // Find currently selected option
            const selectedOption = Array.from(gradingSelect.options).find(option => option.value === gradingBox.value);

            // Key is <Up> and selection is not first option
            if (event.key === 'ArrowUp' &&
                selectedOption !== undefined &&
                selectedOption !== gradingSelect.firstElementChild
            ) {
                selectedOption.selected = false;
                selectedOption.previousElementSibling.selected = true;
                gradingBox.value = selectedOption.previousElementSibling.value;
            }

            // Key is <Down> and selection is not last option
            if (event.key === 'ArrowDown' &&
                selectedOption !== gradingSelect.lastElementChild
            ) {
                // If no option is selected, select first one
                if (selectedOption === undefined) {
                        gradingSelect.firstElementChild.selected = true;
                        gradingBox.value = gradingSelect.firstElementChild.value;
                } else {
                        selectedOption.selected = false;
                        selectedOption.nextElementSibling.selected = true;
                        gradingBox.value = selectedOption.nextElementSibling.value;
                }
            }
        });

        // Expand select to encompass all options
        if (fitOptions) {
            const height = gradingSelect.scrollHeight + (gradingSelect.offsetHeight - gradingSelect.clientHeight);

            gradingSelect.classList.add(styles.fitOptions);
            gradingSelect.style.height = `${height}px`;
        }

        if (letterShortcut) {
            function setGradingBoxValue() {
                // Find option based on letter matcher regexp
                const collator = new Intl.Collator([], { usage: 'search', sensitivity: 'accent' });
                const predicate = ({ value }) => (collator.compare(value.match(letterRegexp)?.groups.letter, gradingBox.value) === 0);
                const option = Array.from(gradingSelect.options).find(predicate);

                // If option is found, set the value
                if (option !== undefined) {
                    gradingBox.value = option.value;
                }
            }

            gradingBox.addEventListener('keypress', event => {
                // Only handle event if <Enter> key was pressed
                if (event.key !== 'Enter') return;

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
        }

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
                // Only handle event if an option was pressed with the left mouse button
                if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

                event.target.classList.remove(styles.open);
            });
        }

    });

    return {
        ...require('../package.json'),
        title: t('package.title'),
        description: t('package.description')
    };
}
