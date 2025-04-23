import { router, dom } from '@artevelde-uas/canvas-lms-app';

import t from './i18n';
import { getGradingStandard } from './api';
import classicSpeedGrader from './classic';
import newSpeedGrader from './new';


export default function (options) {
    router.onRoute(['courses.gradebook.speedgrader', 'courses.gradebook.speedgrader.student'], async ({ courseId, assignmentId }) => {
        const gradingStandard = await getGradingStandard(courseId, assignmentId);

        // Stop if no grading scheme found
        if (gradingStandard === null) {
            console.error('Grading scheme not found');

            return;
        }

        // Wait for the grading INPUT element to appear
        // and then run the appropriate SpeedGrader function

        // Classic SpeedGrader
        dom.onElementReady('#grading-box-extended').then(gradingBox => {
            classicSpeedGrader(gradingBox, gradingStandard, options);
        });

        // New SpeedGrader
        dom.onElementReady('[data-testid="grade-input"]').then(gradeInput => {
            newSpeedGrader(gradeInput, gradingStandard, options);
        });

    });

    return {
        ...require('../package.json'),
        title: t('package.title'),
        description: t('package.description')
    };
}
