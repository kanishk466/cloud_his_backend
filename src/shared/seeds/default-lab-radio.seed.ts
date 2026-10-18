import {
  LabDepartmentType,
  ObservationDataType,
  PrismaClient,
  SpecimenType,
} from '@prisma/client';

// ─── DEFAULT LAB DEPARTMENTS ─────────────────────────────────────────────────

export const DEFAULT_LAB_DEPARTMENTS: Array<{
  code: string;
  name: string;
  departmentType: LabDepartmentType;
  turnaroundHours: number;
}> = [
  {
    code: 'BIO',
    name: 'Biochemistry',
    departmentType: 'BIOCHEMISTRY',
    turnaroundHours: 6,
  },
  {
    code: 'HEM',
    name: 'Hematology',
    departmentType: 'HEMATOLOGY',
    turnaroundHours: 4,
  },
  {
    code: 'MIC',
    name: 'Microbiology',
    departmentType: 'MICROBIOLOGY',
    turnaroundHours: 48,
  },
  {
    code: 'PAT',
    name: 'Pathology',
    departmentType: 'PATHOLOGY',
    turnaroundHours: 24,
  },
  {
    code: 'SER',
    name: 'Serology',
    departmentType: 'SEROLOGY',
    turnaroundHours: 12,
  },
  {
    code: 'RAD_XR',
    name: 'Radiology X-Ray',
    departmentType: 'RADIOLOGY',
    turnaroundHours: 2,
  },
  {
    code: 'RAD_USG',
    name: 'Ultrasound',
    departmentType: 'RADIOLOGY',
    turnaroundHours: 1,
  },
  {
    code: 'RAD_CT',
    name: 'CT Scan',
    departmentType: 'RADIOLOGY',
    turnaroundHours: 4,
  },
  {
    code: 'RAD_MRI',
    name: 'MRI',
    departmentType: 'RADIOLOGY',
    turnaroundHours: 8,
  },
  {
    code: 'CARD',
    name: 'Cardiology',
    departmentType: 'CARDIOLOGY',
    turnaroundHours: 2,
  },
];

export interface SeedLabRadioResult {
  seeded: boolean;
  labDepartments: number;
  investigations: number;
  observations: number;
  referenceRanges: number;
}

// ─── SESSION 2: DEFAULT TEMPLATES & COMMENTS ─────────────────────────────────

export const DEFAULT_REPORT_COMMENTS: Array<{
  category: string;
  shortcut: string;
  commentText: string;
}> = [
  {
    category: 'SAMPLE_QUALITY',
    shortcut: 'HEM',
    commentText: 'Sample hemolyzed — results may be affected.',
  },
  {
    category: 'SAMPLE_QUALITY',
    shortcut: 'LIP',
    commentText: 'Sample lipemic — results may be affected.',
  },
  {
    category: 'SAMPLE_QUALITY',
    shortcut: 'ICT',
    commentText: 'Sample icteric — results may be affected.',
  },
  {
    category: 'SAMPLE_QUALITY',
    shortcut: 'INS',
    commentText: 'Sample quantity insufficient for all tests.',
  },
  {
    category: 'TECHNICAL',
    shortcut: 'REP',
    commentText: 'Repeat test advised.',
  },
  {
    category: 'TECHNICAL',
    shortcut: 'VER',
    commentText: 'Result verified and approved.',
  },
  {
    category: 'TECHNICAL',
    shortcut: 'DEL',
    commentText: 'Result delayed due to technical reasons.',
  },
  {
    category: 'CLINICAL',
    shortcut: 'COR',
    commentText: 'Clinical correlation advised.',
  },
  {
    category: 'CLINICAL',
    shortcut: 'FAST',
    commentText: 'Patient was not fasting — results may vary.',
  },
  {
    category: 'DISCLAIMER',
    shortcut: 'STD',
    commentText:
      'This report is confidential and intended for the referring physician only. Results should be interpreted in conjunction with clinical findings.',
  },
];

export interface SeedTemplatesResult {
  seeded: boolean;
  templates: number;
  comments: number;
  interpretations: number;
  helps: number;
}

// ─── SESSION 3: DEFAULT CONTAINERS & SAMPLE TYPES ────────────────────────────

export const DEFAULT_SAMPLE_CONTAINERS: Array<{
  code: string;
  name: string;
  capColor: string;
  hexColorCode: string;
  additive: string;
  defaultVolumeMl: number;
  tubeType: string;
  sortOrder: number;
}> = [
  {
    code: 'SST_YELLOW',
    name: 'SST Gel Tube',
    capColor: 'Yellow/Gold',
    hexColorCode: '#FFD700',
    additive: 'Clot Activator & Gel Separator',
    defaultVolumeMl: 4.0,
    tubeType: 'VACUTAINER',
    sortOrder: 1,
  },
  {
    code: 'EDTA_PURPLE',
    name: 'EDTA Tube',
    capColor: 'Lavender',
    hexColorCode: '#9370DB',
    additive: 'K2 EDTA Anticoagulant',
    defaultVolumeMl: 2.0,
    tubeType: 'VACUTAINER',
    sortOrder: 2,
  },
  {
    code: 'CITRATE_BLUE',
    name: 'Sodium Citrate Tube',
    capColor: 'Light Blue',
    hexColorCode: '#87CEEB',
    additive: '3.2% Sodium Citrate',
    defaultVolumeMl: 2.7,
    tubeType: 'VACUTAINER',
    sortOrder: 3,
  },
  {
    code: 'FLUORIDE_GREY',
    name: 'Fluoride Glucose Tube',
    capColor: 'Grey',
    hexColorCode: '#808080',
    additive: 'Sodium Fluoride + Potassium Oxalate',
    defaultVolumeMl: 2.0,
    tubeType: 'VACUTAINER',
    sortOrder: 4,
  },
  {
    code: 'PLAIN_RED',
    name: 'Plain Clot Tube',
    capColor: 'Red',
    hexColorCode: '#DC143C',
    additive: 'No Additive / Clot Activator',
    defaultVolumeMl: 5.0,
    tubeType: 'VACUTAINER',
    sortOrder: 5,
  },
  {
    code: 'HEPARIN_GREEN',
    name: 'Heparin Tube',
    capColor: 'Green',
    hexColorCode: '#2E8B57',
    additive: 'Lithium Heparin',
    defaultVolumeMl: 3.0,
    tubeType: 'VACUTAINER',
    sortOrder: 6,
  },
  {
    code: 'STERILE_CUP',
    name: 'Sterile Urine Cup',
    capColor: 'White/Clear',
    hexColorCode: '#FFFFFF',
    additive: 'None',
    defaultVolumeMl: 50.0,
    tubeType: 'STERILE_CUP',
    sortOrder: 7,
  },
  {
    code: 'STERILE_SWAB',
    name: 'Culture Swab in Transport Medium',
    capColor: 'White',
    hexColorCode: '#F5F5F5',
    additive: 'Amies Medium',
    defaultVolumeMl: 1.0,
    tubeType: 'SWAB_TUBE',
    sortOrder: 8,
  },
];

export const DEFAULT_SAMPLE_TYPES: Array<{
  code: string;
  name: string;
  containerCode?: string;
  storageTemp: 'ROOM_TEMPERATURE' | 'REFRIGERATED';
  stabilityRoomTempHours: number;
  stabilityFridgeHours: number;
  stabilityFrozenDays: number;
  archiveDays: number;
  collectionInstructions?: string;
}> = [
  {
    code: 'WB',
    name: 'Whole Blood',
    containerCode: 'EDTA_PURPLE',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 4,
    stabilityFridgeHours: 24,
    stabilityFrozenDays: 0,
    archiveDays: 2,
  },
  {
    code: 'SER',
    name: 'Serum',
    containerCode: 'SST_YELLOW',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 6,
    stabilityFridgeHours: 48,
    stabilityFrozenDays: 30,
    archiveDays: 7,
  },
  {
    code: 'PLA',
    name: 'Citrated Plasma',
    containerCode: 'CITRATE_BLUE',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 2,
    stabilityFridgeHours: 4,
    stabilityFrozenDays: 14,
    archiveDays: 2,
  },
  {
    code: 'FLU_PLA',
    name: 'Fluoride Plasma',
    containerCode: 'FLUORIDE_GREY',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 8,
    stabilityFridgeHours: 48,
    stabilityFrozenDays: 30,
    archiveDays: 2,
  },
  {
    code: 'URN',
    name: 'Midstream Random Urine',
    containerCode: 'STERILE_CUP',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 2,
    stabilityFridgeHours: 24,
    stabilityFrozenDays: 0,
    archiveDays: 1,
    collectionInstructions: 'Early morning mid-stream catch preferred',
  },
  {
    code: '24URN',
    name: '24-Hour Urine Specimen',
    containerCode: 'STERILE_CUP',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 24,
    stabilityFridgeHours: 48,
    stabilityFrozenDays: 0,
    archiveDays: 1,
    collectionInstructions:
      'Collect all urine over 24 hours; discard first morning void',
  },
  {
    code: 'CSF',
    name: 'Cerebrospinal Fluid',
    containerCode: 'PLAIN_RED',
    storageTemp: 'ROOM_TEMPERATURE',
    stabilityRoomTempHours: 1,
    stabilityFridgeHours: 24,
    stabilityFrozenDays: 30,
    archiveDays: 7,
    collectionInstructions:
      'Process immediately — do not refrigerate before cell count',
  },
  {
    code: 'SPT',
    name: 'Sputum Specimen',
    containerCode: 'STERILE_CUP',
    storageTemp: 'REFRIGERATED',
    stabilityRoomTempHours: 2,
    stabilityFridgeHours: 12,
    stabilityFrozenDays: 0,
    archiveDays: 2,
    collectionInstructions: 'Deep cough specimen, not saliva',
  },
];

export interface SeedPreAnalyticalResult {
  seeded: boolean;
  containers: number;
  sampleTypes: number;
  linkedInvestigations: number;
}

// ─── SESSION 4: MICROBIOLOGY & OUTSOURCE LABS ────────────────────────────────

export const DEFAULT_ORGANISMS: Array<{
  code: string;
  name: string;
  organismType:
    | 'BACTERIA_GRAM_POSITIVE'
    | 'BACTERIA_GRAM_NEGATIVE'
    | 'BACTERIA_AFB'
    | 'FUNGI';
  isCommon: boolean;
}> = [
  {
    code: 'ECOLI',
    name: 'Escherichia coli',
    organismType: 'BACTERIA_GRAM_NEGATIVE',
    isCommon: true,
  },
  {
    code: 'KPNEU',
    name: 'Klebsiella pneumoniae',
    organismType: 'BACTERIA_GRAM_NEGATIVE',
    isCommon: true,
  },
  {
    code: 'PAERU',
    name: 'Pseudomonas aeruginosa',
    organismType: 'BACTERIA_GRAM_NEGATIVE',
    isCommon: true,
  },
  {
    code: 'SAUR',
    name: 'Staphylococcus aureus',
    organismType: 'BACTERIA_GRAM_POSITIVE',
    isCommon: true,
  },
  {
    code: 'EFAC',
    name: 'Enterococcus faecalis',
    organismType: 'BACTERIA_GRAM_POSITIVE',
    isCommon: true,
  },
  {
    code: 'CALB',
    name: 'Candida albicans',
    organismType: 'FUNGI',
    isCommon: true,
  },
  {
    code: 'MTUB',
    name: 'Mycobacterium tuberculosis',
    organismType: 'BACTERIA_AFB',
    isCommon: true,
  },
];

export const DEFAULT_ANTIBIOTICS: Array<{
  code: string;
  name: string;
  antibioticClass:
    | 'AMINOGLYCOSIDES'
    | 'FLUOROQUINOLONES'
    | 'CEPHALOSPORINS'
    | 'CARBAPENEMS'
    | 'PENICILLINS'
    | 'GLYCOPEPTIDES'
    | 'OXAZOLIDINONES'
    | 'POLYMYXINS';
  sortOrder: number;
}> = [
  {
    code: 'AK',
    name: 'Amikacin',
    antibioticClass: 'AMINOGLYCOSIDES',
    sortOrder: 1,
  },
  {
    code: 'GEN',
    name: 'Gentamicin',
    antibioticClass: 'AMINOGLYCOSIDES',
    sortOrder: 2,
  },
  {
    code: 'CIP',
    name: 'Ciprofloxacin',
    antibioticClass: 'FLUOROQUINOLONES',
    sortOrder: 3,
  },
  {
    code: 'LEV',
    name: 'Levofloxacin',
    antibioticClass: 'FLUOROQUINOLONES',
    sortOrder: 4,
  },
  {
    code: 'CTR',
    name: 'Ceftriaxone',
    antibioticClass: 'CEPHALOSPORINS',
    sortOrder: 5,
  },
  {
    code: 'CPM',
    name: 'Cefepime',
    antibioticClass: 'CEPHALOSPORINS',
    sortOrder: 6,
  },
  {
    code: 'MEM',
    name: 'Meropenem',
    antibioticClass: 'CARBAPENEMS',
    sortOrder: 7,
  },
  {
    code: 'IPM',
    name: 'Imipenem',
    antibioticClass: 'CARBAPENEMS',
    sortOrder: 8,
  },
  {
    code: 'PIT',
    name: 'Piperacillin + Tazobactam',
    antibioticClass: 'PENICILLINS',
    sortOrder: 9,
  },
  {
    code: 'VA',
    name: 'Vancomycin',
    antibioticClass: 'GLYCOPEPTIDES',
    sortOrder: 10,
  },
  {
    code: 'LNZ',
    name: 'Linezolid',
    antibioticClass: 'OXAZOLIDINONES',
    sortOrder: 11,
  },
  {
    code: 'CST',
    name: 'Colistin',
    antibioticClass: 'POLYMYXINS',
    sortOrder: 12,
  },
];

export const DEFAULT_OUTSOURCE_LABS: Array<{
  code: string;
  labName: string;
  city: string;
  courierPickupTime: string;
}> = [
  {
    code: 'LAL',
    labName: 'Dr. Lal PathLabs Ltd.',
    city: 'National / Regional Hub',
    courierPickupTime: '14:00 daily',
  },
  {
    code: 'AGILUS',
    labName: 'Agilus Diagnostics (SRL)',
    city: 'National / Regional Hub',
    courierPickupTime: '15:30 daily',
  },
  {
    code: 'METRO',
    labName: 'Metropolis Healthcare Ltd.',
    city: 'National / Regional Hub',
    courierPickupTime: '16:00 daily',
  },
];

export interface SeedMicrobiologyResult {
  seeded: boolean;
  organisms: number;
  antibiotics: number;
  panelMappings: number;
  outsourceLabs: number;
}

/**
 * Session 4 seed — pathogen catalog, antibiotic catalog, the standard
 * ECOLI AST panel (first-line + reserve), and reference outsource labs.
 * Idempotent: skips when the tenant already has organisms.
 */
export async function seedDefaultMicrobiologyAndOutsource(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedMicrobiologyResult> {
  const empty: SeedMicrobiologyResult = {
    seeded: false,
    organisms: 0,
    antibiotics: 0,
    panelMappings: 0,
    outsourceLabs: 0,
  };

  const existing = await client.organismMaster.count({ where: { tenantId } });
  if (existing > 0) return empty;

  return client.$transaction(
    async (tx) => {
      const again = await tx.organismMaster.count({ where: { tenantId } });
      if (again > 0) return empty;

      // ─── 1. Organisms ────────────────────────────────────────────────────
      const organismIdByCode = new Map<string, string>();
      for (const o of DEFAULT_ORGANISMS) {
        const created = await tx.organismMaster.create({
          data: { ...o, tenantId },
        });
        organismIdByCode.set(o.code, created.id);
      }

      // ─── 2. Antibiotics ──────────────────────────────────────────────────
      const antibioticIdByCode = new Map<string, string>();
      for (const a of DEFAULT_ANTIBIOTICS) {
        const created = await tx.antibioticMaster.create({
          data: { ...a, tenantId },
        });
        antibioticIdByCode.set(a.code, created.id);
      }

      // ─── 3. Standard AST panel for ECOLI ─────────────────────────────────
      const ecoliPanel: Array<{ code: string; isFirstLine: boolean }> = [
        { code: 'AK', isFirstLine: true },
        { code: 'CIP', isFirstLine: true },
        { code: 'CTR', isFirstLine: true },
        { code: 'PIT', isFirstLine: true },
        { code: 'MEM', isFirstLine: false },
        { code: 'CST', isFirstLine: false },
      ];

      let panelMappings = 0;
      const ecoliId = organismIdByCode.get('ECOLI');
      if (ecoliId) {
        await tx.organismAntibioticMapping.createMany({
          data: ecoliPanel.map((p, index) => ({
            organismId: ecoliId,
            antibioticId: antibioticIdByCode.get(p.code)!,
            sortOrder: index,
            isFirstLine: p.isFirstLine,
          })),
        });
        panelMappings = ecoliPanel.length;
      }

      // ─── 4. Outsource reference labs ─────────────────────────────────────
      await tx.outsourceLabMaster.createMany({
        data: DEFAULT_OUTSOURCE_LABS.map((l) => ({ ...l, tenantId })),
      });

      return {
        seeded: true,
        organisms: DEFAULT_ORGANISMS.length,
        antibiotics: DEFAULT_ANTIBIOTICS.length,
        panelMappings,
        outsourceLabs: DEFAULT_OUTSOURCE_LABS.length,
      };
    },
    { timeout: 60000 },
  );
}

/**
 * Session 3 seed — standard vacutainers + specimen types with stability/
 * retention rules, and links the seeded investigations (LIPID/BSF/CBC)
 * to their containers so the collection worklist works out of the box.
 * Idempotent: skips when the tenant already has containers.
 */
export async function seedDefaultContainersAndSampleTypes(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedPreAnalyticalResult> {
  const empty: SeedPreAnalyticalResult = {
    seeded: false,
    containers: 0,
    sampleTypes: 0,
    linkedInvestigations: 0,
  };

  const existing = await client.sampleContainerMaster.count({
    where: { tenantId },
  });
  if (existing > 0) return empty;

  return client.$transaction(
    async (tx) => {
      const again = await tx.sampleContainerMaster.count({
        where: { tenantId },
      });
      if (again > 0) return empty;

      // ─── 1. Containers ───────────────────────────────────────────────────
      const containerIdByCode = new Map<string, string>();
      for (const c of DEFAULT_SAMPLE_CONTAINERS) {
        const created = await tx.sampleContainerMaster.create({
          data: { ...c, tenantId },
        });
        containerIdByCode.set(c.code, created.id);
      }

      // ─── 2. Sample types (with default container links) ──────────────────
      const sampleTypeIdByCode = new Map<string, string>();
      for (const s of DEFAULT_SAMPLE_TYPES) {
        const { containerCode, ...rest } = s;
        const created = await tx.sampleType.create({
          data: {
            ...rest,
            tenantId,
            defaultContainerId: containerCode
              ? (containerIdByCode.get(containerCode) ?? null)
              : null,
          },
        });
        sampleTypeIdByCode.set(s.code, created.id);
      }

      // ─── 3. Link seeded investigations → sample type + container ─────────
      const investigationLinks: Array<{
        investigationCode: string;
        sampleTypeCode: string;
        containerCode: string;
      }> = [
        {
          investigationCode: 'LIPID',
          sampleTypeCode: 'SER',
          containerCode: 'SST_YELLOW',
        },
        {
          investigationCode: 'BSF',
          sampleTypeCode: 'FLU_PLA',
          containerCode: 'FLUORIDE_GREY',
        },
        {
          investigationCode: 'CBC',
          sampleTypeCode: 'WB',
          containerCode: 'EDTA_PURPLE',
        },
      ];

      let linkedInvestigations = 0;
      for (const link of investigationLinks) {
        const result = await tx.investigation.updateMany({
          where: { tenantId, code: link.investigationCode, deletedAt: null },
          data: {
            sampleTypeId: sampleTypeIdByCode.get(link.sampleTypeCode) ?? null,
            sampleContainerId:
              containerIdByCode.get(link.containerCode) ?? null,
          },
        });
        linkedInvestigations += result.count;
      }

      return {
        seeded: true,
        containers: DEFAULT_SAMPLE_CONTAINERS.length,
        sampleTypes: DEFAULT_SAMPLE_TYPES.length,
        linkedInvestigations,
      };
    },
    { timeout: 60000 },
  );
}

/**
 * Session 2 seed — default report templates, comment library,
 * TCHOL interpretation rules and GLU_F help texts.
 * Idempotent: skips when the tenant already has report templates.
 * Expects seedDefaultLabSetup to have run (TCHOL/GLU_F observations).
 */
export async function seedDefaultTemplatesAndComments(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedTemplatesResult> {
  const empty: SeedTemplatesResult = {
    seeded: false,
    templates: 0,
    comments: 0,
    interpretations: 0,
    helps: 0,
  };

  const existing = await client.reportTemplate.count({ where: { tenantId } });
  if (existing > 0) return empty;

  return client.$transaction(
    async (tx) => {
      const again = await tx.reportTemplate.count({ where: { tenantId } });
      if (again > 0) return empty;

      let templates = 0;
      let comments = 0;
      let interpretations = 0;
      let helps = 0;

      // ─── 1. Global default template ──────────────────────────────────────
      await tx.reportTemplate.create({
        data: {
          tenantId,
          name: 'Standard Lab Report',
          templateType: 'NUMERIC_TABLE',
          isDefault: true,
          headerHtml:
            '<h2>{{hospitalName}}</h2><p>{{patientName}} | {{uhid}} | {{ageGender}}</p>',
          bodyHtml: '<table class="results">{{resultsTable}}</table>',
          footerHtml: '<p>— End of Report —</p><p>{{pathologistSignature}}</p>',
        },
      });
      templates++;

      // ─── 2. Department templates ─────────────────────────────────────────
      const deptTemplates: Array<{
        deptCodes: string[];
        name: string;
        templateType: 'DESCRIPTIVE' | 'CULTURE_SENSITIVITY';
      }> = [
        {
          deptCodes: ['RAD_XR', 'RAD_USG', 'RAD_CT', 'RAD_MRI'],
          name: 'Radiology Report',
          templateType: 'DESCRIPTIVE',
        },
        {
          deptCodes: ['MIC'],
          name: 'Culture & Sensitivity',
          templateType: 'CULTURE_SENSITIVITY',
        },
        {
          deptCodes: ['PAT'],
          name: 'Pathology Report',
          templateType: 'DESCRIPTIVE',
        },
      ];

      for (const group of deptTemplates) {
        for (const code of group.deptCodes) {
          const dept = await tx.labDepartment.findFirst({
            where: { tenantId, code, deletedAt: null },
            select: { id: true },
          });
          if (!dept) continue;

          await tx.reportTemplate.create({
            data: {
              tenantId,
              labDepartmentId: dept.id,
              name: group.name,
              templateType: group.templateType,
              isDefault: true,
            },
          });
          templates++;
        }
      }

      // ─── 3. Report comment library ───────────────────────────────────────
      await tx.reportComment.createMany({
        data: DEFAULT_REPORT_COMMENTS.map((c) => ({ ...c, tenantId })),
        skipDuplicates: true,
      });
      comments = DEFAULT_REPORT_COMMENTS.length;

      // ─── 4. TCHOL interpretation rules (if the observation exists) ───────
      const tchol = await tx.observation.findFirst({
        where: { tenantId, code: 'TCHOL', deletedAt: null },
        select: { id: true },
      });
      if (tchol) {
        await tx.investigationInterpretation.createMany({
          data: [
            {
              tenantId,
              observationId: tchol.id,
              condition: 'ABOVE_CRITICAL_HIGH' as const,
              interpretationText:
                'CRITICAL: Severe hypercholesterolemia. Immediate lipid-lowering therapy evaluation required.',
              severity: 'CRITICAL',
              sortOrder: 0,
            },
            {
              tenantId,
              observationId: tchol.id,
              condition: 'ABOVE_MAX' as const,
              interpretationText:
                'Elevated cholesterol. Lifestyle modification and clinical evaluation advised.',
              severity: 'WARNING',
              sortOrder: 1,
            },
            {
              tenantId,
              observationId: tchol.id,
              condition: 'BELOW_MIN' as const,
              interpretationText:
                'Low cholesterol. Evaluate for malnutrition, hyperthyroidism, or liver disease.',
              severity: 'WARNING',
              sortOrder: 2,
            },
          ],
        });
        interpretations = 3;
      }

      // ─── 5. GLU_F help texts ─────────────────────────────────────────────
      const gluF = await tx.observation.findFirst({
        where: { tenantId, code: 'GLU_F', deletedAt: null },
        select: { id: true },
      });
      if (gluF) {
        await tx.observationHelp.createMany({
          data: [
            {
              tenantId,
              observationId: gluF.id,
              helpTitle: 'Sample Collection',
              helpText:
                'Fasting venous blood sample required. Patient must fast for 8-12 hours.',
              sortOrder: 0,
            },
            {
              tenantId,
              observationId: gluF.id,
              helpTitle: 'Interference',
              helpText:
                'Hemolysis may falsely elevate results. IV fluid contamination may dilute results.',
              sortOrder: 1,
            },
            {
              tenantId,
              observationId: gluF.id,
              helpTitle: 'Clinical Significance',
              helpText:
                'Fasting glucose ≥126 mg/dL on two occasions is diagnostic of Diabetes Mellitus (ADA criteria).',
              sortOrder: 2,
            },
          ],
        });
        helps = 3;
      }

      return { seeded: true, templates, comments, interpretations, helps };
    },
    { timeout: 60000 },
  );
}

/**
 * Seeds default lab departments + sample investigations (Lipid Profile,
 * Blood Sugar Fasting, CBC) with observations and reference ranges.
 * Idempotent: skips entirely when the tenant already has lab departments.
 */
export async function seedDefaultLabSetup(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedLabRadioResult> {
  const empty: SeedLabRadioResult = {
    seeded: false,
    labDepartments: 0,
    investigations: 0,
    observations: 0,
    referenceRanges: 0,
  };

  const existing = await client.labDepartment.count({ where: { tenantId } });
  if (existing > 0) return empty;

  return client.$transaction(
    async (tx) => {
      const again = await tx.labDepartment.count({ where: { tenantId } });
      if (again > 0) return empty;

      // ─── 1. Lab departments ─────────────────────────────────────────────
      const deptIdByCode = new Map<string, string>();
      for (const dept of DEFAULT_LAB_DEPARTMENTS) {
        const created = await tx.labDepartment.create({
          data: { ...dept, tenantId },
        });
        deptIdByCode.set(dept.code, created.id);
      }

      // Optional link: DIAG service category (from service tree seed)
      const diagCategory = await tx.serviceCategoryMaster.findFirst({
        where: { tenantId, code: 'DIAG', deletedAt: null },
        select: { id: true },
      });
      const subCategoryIdByCode = new Map<string, string>();
      if (diagCategory) {
        const subs = await tx.serviceSubCategory.findMany({
          where: { tenantId, categoryId: diagCategory.id, deletedAt: null },
          select: { id: true, code: true },
        });
        for (const s of subs) subCategoryIdByCode.set(s.code, s.id);
      }

      // ─── 2. Investigations (service + dept + observations + ranges) ─────
      let investigations = 0;
      let observations = 0;
      let referenceRanges = 0;

      const ensureService = async (
        serviceCode: string,
        serviceName: string,
        baseRate: number,
        subCategoryCode?: string,
      ) => {
        const existingService = await tx.serviceMaster.findFirst({
          where: { tenantId, serviceCode, deletedAt: null },
        });
        if (existingService) return existingService.id;

        const created = await tx.serviceMaster.create({
          data: {
            tenantId,
            serviceCode,
            serviceName,
            baseRate,
            categoryId: diagCategory?.id ?? null,
            subCategoryId: subCategoryCode
              ? (subCategoryIdByCode.get(subCategoryCode) ?? null)
              : null,
          },
        });
        return created.id;
      };

      const createInvestigation = async (input: {
        deptCode: string;
        serviceCode: string;
        serviceName: string;
        baseRate: number;
        serviceSubCategory?: string;
        name: string;
        code: string;
        shortName?: string;
        specimenType?: SpecimenType;
        fastingRequired?: boolean;
        observations: Array<{
          code: string;
          name: string;
          unit?: string;
          dataType?: ObservationDataType;
          formulaExpression?: string;
          ranges?: Array<{
            gender?: 'MALE' | 'FEMALE';
            minAgeYears?: number;
            maxAgeYears?: number;
            minValue?: number;
            maxValue?: number;
            criticalLow?: number;
            criticalHigh?: number;
          }>;
        }>;
      }) => {
        const serviceId = await ensureService(
          input.serviceCode,
          input.serviceName,
          input.baseRate,
          input.serviceSubCategory,
        );

        const investigation = await tx.investigation.create({
          data: {
            tenantId,
            labDepartmentId: deptIdByCode.get(input.deptCode)!,
            serviceId,
            name: input.name,
            code: input.code,
            shortName: input.shortName,
            specimenType: input.specimenType ?? 'BLOOD',
            fastingRequired: input.fastingRequired ?? false,
          },
        });
        investigations++;

        let sortOrder = 0;
        for (const obs of input.observations) {
          const observation = await tx.observation.upsert({
            where: { tenantId_code: { tenantId, code: obs.code } },
            update: {},
            create: {
              tenantId,
              code: obs.code,
              name: obs.name,
              unit: obs.unit,
              dataType: obs.dataType ?? 'NUMERIC',
              formulaExpression: obs.formulaExpression,
              sortOrder,
            },
          });
          observations++;

          await tx.investigationObservationMapping.create({
            data: {
              investigationId: investigation.id,
              observationId: observation.id,
              sortOrder,
            },
          });

          if (obs.ranges?.length) {
            await tx.referenceRange.createMany({
              data: obs.ranges.map((r) => ({
                ...r,
                gender: r.gender ?? null,
                tenantId,
                observationId: observation.id,
              })),
            });
            referenceRanges += obs.ranges.length;
          }
          sortOrder++;
        }
      };

      // ─── Lipid Profile (BIO) ─────────────────────────────────────────────
      await createInvestigation({
        deptCode: 'BIO',
        serviceCode: 'LAB-LIPID',
        serviceName: 'Lipid Profile',
        baseRate: 700,
        serviceSubCategory: 'BIO',
        name: 'Lipid Profile',
        code: 'LIPID',
        shortName: 'LP',
        fastingRequired: true,
        observations: [
          {
            code: 'TCHOL',
            name: 'Total Cholesterol',
            unit: 'mg/dL',
            ranges: [
              {
                minAgeYears: 0,
                maxAgeYears: 19,
                minValue: 120,
                maxValue: 170,
                criticalHigh: 200,
              },
              {
                gender: 'MALE',
                minAgeYears: 20,
                minValue: 125,
                maxValue: 200,
                criticalHigh: 240,
              },
              {
                gender: 'FEMALE',
                minAgeYears: 20,
                minValue: 125,
                maxValue: 200,
                criticalHigh: 240,
              },
            ],
          },
          { code: 'HDL', name: 'HDL Cholesterol', unit: 'mg/dL' },
          {
            code: 'LDL',
            name: 'LDL Cholesterol',
            unit: 'mg/dL',
            dataType: 'CALCULATED',
            formulaExpression: 'TCHOL - HDL - VLDL',
          },
          { code: 'TRIG', name: 'Triglycerides', unit: 'mg/dL' },
          {
            code: 'VLDL',
            name: 'VLDL Cholesterol',
            unit: 'mg/dL',
            dataType: 'CALCULATED',
            formulaExpression: 'TRIG / 5',
          },
        ],
      });

      // ─── Blood Sugar Fasting (BIO) ───────────────────────────────────────
      await createInvestigation({
        deptCode: 'BIO',
        serviceCode: 'LAB-BSF',
        serviceName: 'Blood Sugar Fasting',
        baseRate: 120,
        serviceSubCategory: 'BIO',
        name: 'Blood Sugar Fasting',
        code: 'BSF',
        shortName: 'FBS',
        fastingRequired: true,
        observations: [
          {
            code: 'GLU_F',
            name: 'Fasting Glucose',
            unit: 'mg/dL',
            ranges: [
              {
                minAgeYears: 0,
                minValue: 70,
                maxValue: 100,
                criticalLow: 50,
                criticalHigh: 300,
              },
            ],
          },
        ],
      });

      // ─── CBC (HEM) ───────────────────────────────────────────────────────
      await createInvestigation({
        deptCode: 'HEM',
        serviceCode: 'LAB-CBC',
        serviceName: 'Complete Blood Count (CBC)',
        baseRate: 250,
        serviceSubCategory: 'HEM',
        name: 'Complete Blood Count',
        code: 'CBC',
        shortName: 'CBC',
        observations: [
          {
            code: 'HGB',
            name: 'Hemoglobin',
            unit: 'g/dL',
            ranges: [
              {
                gender: 'MALE',
                minAgeYears: 18,
                minValue: 13.0,
                maxValue: 17.0,
                criticalLow: 7.0,
                criticalHigh: 20.0,
              },
              {
                gender: 'FEMALE',
                minAgeYears: 18,
                minValue: 12.0,
                maxValue: 15.0,
                criticalLow: 7.0,
                criticalHigh: 20.0,
              },
              {
                minAgeYears: 0,
                maxAgeYears: 17,
                minValue: 11.0,
                maxValue: 13.0,
                criticalLow: 7.0,
                criticalHigh: 18.0,
              },
            ],
          },
          { code: 'WBC', name: 'Total WBC Count', unit: '/cmm' },
          { code: 'RBC', name: 'RBC Count', unit: 'million/cmm' },
          { code: 'PLT', name: 'Platelet Count', unit: 'lakhs/cmm' },
          { code: 'ESR', name: 'ESR', unit: 'mm/hr' },
        ],
      });

      return {
        seeded: true,
        labDepartments: DEFAULT_LAB_DEPARTMENTS.length,
        investigations,
        observations,
        referenceRanges,
      };
    },
    { timeout: 60000 },
  );
}
