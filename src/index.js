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

export default function ({ letterRegexp = /(?<letter>\w+) \(.+\)/ }) {
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

        // Expand select to encompass all options
        const height = gradingSelect.scrollHeight + (gradingSelect.offsetHeight - gradingSelect.clientHeight);
        gradingSelect.style.height = `${height}px`;

        gradingSelect.addEventListener('mousedown', event => {
            event.preventDefault();

            // Only handle event if an option was pressed with the left mouse button
            if (event.target.tagName !== 'OPTION' || event.button !== 0) return;

            // Set the value and trigger a change event
            gradingBox.value = event.target.value;
            gradingBox.dispatchEvent(new Event('change'));
        });

        gradingBox.addEventListener('keypress', event => {
            // Only handle event if <Enter> key was pressed
            if (event.key !== 'Enter') return;

            event.preventDefault();

            // Find option based on letter matcher regexp
            const collator = new Intl.Collator([], { usage: 'search', sensitivity: 'accent' });
            const predicate = ({ value }) => (collator.compare(value.match(letterRegexp)?.groups.letter, gradingBox.value) === 0);
            const option = Array.from(gradingSelect.options).find(predicate);

            // If option is found, set the value
            if (option !== undefined) {
                gradingBox.value = option.value;
            }

            // Manually trigger a change event
            gradingBox.dispatchEvent(new Event('change'));
        });

    });

    return {
        ...require('../package.json'),
        title: t('package.title'),
        description: t('package.description')
    };
}
