import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

import { LabDepartmentsController } from './controllers/lab-departments.controller';
import { InvestigationsController } from './controllers/investigations.controller';
import { ObservationsController } from './controllers/observations.controller';
import { ReferenceRangesController } from './controllers/reference-ranges.controller';
import { TemplatesController } from './controllers/templates.controller';
import { InterpretationsController } from './controllers/interpretations.controller';
import { ObservationHelpsController } from './controllers/observation-helps.controller';
import { ReportCommentsController } from './controllers/report-comments.controller';
import { SampleContainersController } from './controllers/sample-containers.controller';
import { SampleTypesController } from './controllers/sample-types.controller';
import { OrganismsController } from './controllers/organisms.controller';
import { AntibioticsController } from './controllers/antibiotics.controller';
import { OutsourceLabsController } from './controllers/outsource-labs.controller';
import { LabSignoffAuthoritiesController } from './controllers/lab-signoff-authorities.controller';

import { LabDepartmentsService } from './services/lab-departments.service';
import { InvestigationsService } from './services/investigations.service';
import { ObservationsService } from './services/observations.service';
import { ReferenceRangesService } from './services/reference-ranges.service';
import { TemplatesService } from './services/templates.service';
import { InterpretationsService } from './services/interpretations.service';
import { ObservationHelpsService } from './services/observation-helps.service';
import { ReportCommentsService } from './services/report-comments.service';
import { SampleContainersService } from './services/sample-containers.service';
import { SampleTypesService } from './services/sample-types.service';
import { OrganismsService } from './services/organisms.service';
import { AntibioticsService } from './services/antibiotics.service';
import { OutsourceLabsService } from './services/outsource-labs.service';
import { LabSignoffAuthoritiesService } from './services/lab-signoff-authorities.service';

import { LabDepartmentsRepository } from './repositories/lab-departments.repository';
import { InvestigationsRepository } from './repositories/investigations.repository';
import { ObservationsRepository } from './repositories/observations.repository';
import { ReferenceRangesRepository } from './repositories/reference-ranges.repository';
import { TemplatesRepository } from './repositories/templates.repository';
import { InterpretationsRepository } from './repositories/interpretations.repository';
import { ObservationHelpsRepository } from './repositories/observation-helps.repository';
import { ReportCommentsRepository } from './repositories/report-comments.repository';
import { SampleContainersRepository } from './repositories/sample-containers.repository';
import { SampleTypesRepository } from './repositories/sample-types.repository';
import { OrganismsRepository } from './repositories/organisms.repository';
import { AntibioticsRepository } from './repositories/antibiotics.repository';
import { OutsourceLabsRepository } from './repositories/outsource-labs.repository';
import { LabSignoffAuthoritiesRepository } from './repositories/lab-signoff-authorities.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    LabDepartmentsController,
    InvestigationsController,
    ObservationsController,
    ReferenceRangesController,
    TemplatesController,
    InterpretationsController,
    ObservationHelpsController,
    ReportCommentsController,
    SampleContainersController,
    SampleTypesController,
    OrganismsController,
    AntibioticsController,
    OutsourceLabsController,
    LabSignoffAuthoritiesController,
  ],
  providers: [
    LabDepartmentsService,
    LabDepartmentsRepository,
    InvestigationsService,
    InvestigationsRepository,
    ObservationsService,
    ObservationsRepository,
    ReferenceRangesService,
    ReferenceRangesRepository,
    TemplatesService,
    TemplatesRepository,
    InterpretationsService,
    InterpretationsRepository,
    ObservationHelpsService,
    ObservationHelpsRepository,
    ReportCommentsService,
    ReportCommentsRepository,
    SampleContainersService,
    SampleContainersRepository,
    SampleTypesService,
    SampleTypesRepository,
    OrganismsService,
    OrganismsRepository,
    AntibioticsService,
    AntibioticsRepository,
    OutsourceLabsService,
    OutsourceLabsRepository,
    LabSignoffAuthoritiesService,
    LabSignoffAuthoritiesRepository,
  ],
  exports: [
    LabDepartmentsService,
    InvestigationsService, // future Lab Result Entry + OPD integration
    ObservationsService,
    ReferenceRangesService, // range lookup → Session 3/4 result entry
    TemplatesService, // report rendering → Session 4
    InterpretationsService, // interpretation engine → Session 3/4 result entry
    ObservationHelpsService,
    ReportCommentsService,
    SampleContainersService,
    SampleTypesService, // collection worklist → barcoding/phlebotomy workflow
    OrganismsService,
    AntibioticsService,
    OutsourceLabsService,
    LabSignoffAuthoritiesService, // NABL sign-off guard → LIS reporting engine
  ],
})
export class LabRadioModule {}
