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
    router.onRoute('courses.gradebook.speedgrader', async ({ courseId, assignmentId }) => {
        const gradingStandard = await getGradingStandard(courseId, assignmentId);

    });

    return {
        ...require('../package.json')
    };
}
