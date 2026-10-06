import { Module } from '@nestjs/common';
import { LabDepartmentModule } from './lab-department/lab-department.module';
import { InvestigationModule } from './investigation/investigation.module';
import { ObservationModule } from './observation/observation.module';
import { InvestigationObservationModule } from './investigation-observation/investigation-observation.module';
import { ReferenceRangeModule } from './reference-range/reference-range.module';
import { TemplateModule } from './template/template.module';
import { InterpretationModule } from './interpretation/interpretation.module';
import { HelpObservationModule } from './help-observation/help-observation.module';
import { LabCommentModule } from './lab-comment/lab-comment.module';
import { SampleContainerModule } from './sample-container/sample-container.module';
import { SampleTypeModule } from './sample-type/sample-type.module';
import { MicroMasterModule } from './micro-master/micro-master.module';
import { OutsourceLabModule } from './outsource-lab/outsource-lab.module';
import { LabApprovalRightModule } from './approval-right/lab-approval-right.module';

/**
 * Lab / Radio (LIS/RIS) Setup aggregator (Phase 2.4).
 *
 * Dependency order:
 *  Group 1 (core):    LabDepartment → Investigation → Observation → Mapping → RefRange
 *  Group 2 (content): Template, Interpretation, HelpObservation, LabComment
 *  Group 3 (pre-analytical): SampleContainer → SampleType
 *  Group 4 (specialized): MicroMaster, OutsourceLab, LabApprovalRight
 */
@Module({
  imports: [
    LabDepartmentModule,
    InvestigationModule,
    ObservationModule,
    InvestigationObservationModule,
    ReferenceRangeModule,
    TemplateModule,
    InterpretationModule,
    HelpObservationModule,
    LabCommentModule,
    SampleContainerModule,
    SampleTypeModule,
    MicroMasterModule,
    OutsourceLabModule,
    LabApprovalRightModule,
  ],
  exports: [
    LabDepartmentModule,
    InvestigationModule,
    ObservationModule,
    InvestigationObservationModule,
    ReferenceRangeModule,
    TemplateModule,
    InterpretationModule,
    HelpObservationModule,
    LabCommentModule,
    SampleContainerModule,
    SampleTypeModule,
    MicroMasterModule,
    OutsourceLabModule,
    LabApprovalRightModule,
  ],
})
export class LabRadioModule {}
