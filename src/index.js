import { router, dom, api } from '@artevelde-uas/canvas-lms-app';


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

export default function () {
    router.onRoute(['courses.gradebook.speedgrader', 'courses.gradebook.speedgrader.student'], async ({ courseId, assignmentId }) => {
        const gradingStandard = await getGradingStandard(courseId, assignmentId);

        if (gradingStandard === null) return;

        const gradingBox = await dom.onElementReady('#grading-box-extended');

        gradingBox.insertAdjacentHTML('afterend', `
            <select multiple>
                ${gradingStandard.grading_scheme.map(({ name }) => `
                    <option value="${name}">${name}</option>
                `).join('\n')}
            </select>
        `);

        const gradingSelect = gradingBox.nextElementSibling;

        gradingSelect.addEventListener('mousedown', (event) => {
            if (event.target.tagName === 'OPTION') {
                gradingBox.value = event.target.value;

                gradingBox.dispatchEvent(new Event('change'));
            }
        });
    });

    return {
        ...require('../package.json')
    };
}
