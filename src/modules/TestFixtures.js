(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const DEMO_WORKSPACE_ID = 'demo-workspace';
  const DEMO_WORKSPACE_NAME = 'FEG Demo Workspace';

  const DEMO_USERS = Object.freeze({
  "admin": {
    "id": "demo-admin",
    "email": "admin.demo@feg.local",
    "displayName": "Demo Admin",
    "role": "admin",
    "workspaceId": "demo-workspace",
    "workspaceName": "FEG Demo Workspace",
    "isDemo": true
  },
  "manager": {
    "id": "demo-manager",
    "email": "manager.demo@feg.local",
    "displayName": "Demo Manager",
    "role": "manager",
    "workspaceId": "demo-workspace",
    "workspaceName": "FEG Demo Workspace",
    "isDemo": true
  },
  "technician": {
    "id": "demo-technician",
    "email": "tech.demo@feg.local",
    "displayName": "Demo Technician",
    "role": "technician",
    "workspaceId": "demo-workspace",
    "workspaceName": "FEG Demo Workspace",
    "isDemo": true
  },
  "warehouse": {
    "id": "demo-warehouse",
    "email": "warehouse.demo@feg.local",
    "displayName": "Demo Warehouse",
    "role": "warehouse",
    "workspaceId": "demo-workspace",
    "workspaceName": "FEG Demo Workspace",
    "isDemo": true
  },
  "viewer": {
    "id": "demo-viewer",
    "email": "viewer.demo@feg.local",
    "displayName": "Demo Viewer",
    "role": "viewer",
    "workspaceId": "demo-workspace",
    "workspaceName": "FEG Demo Workspace",
    "isDemo": true
  }
});

  const DEMO_INVITES = Object.freeze([
  {
    "key": "DEMO-ADMIN-0001",
    "role": "admin",
    "workspace": "FEG Demo Workspace",
    "status": "demo"
  },
  {
    "key": "DEMO-MANAGER-0001",
    "role": "manager",
    "workspace": "FEG Demo Workspace",
    "status": "demo"
  },
  {
    "key": "DEMO-TECH-0001",
    "role": "technician",
    "workspace": "FEG Demo Workspace",
    "status": "demo"
  },
  {
    "key": "DEMO-WAREHOUSE-0001",
    "role": "warehouse",
    "workspace": "FEG Demo Workspace",
    "status": "demo"
  }
]);

  const EXCEL_EQUIPMENT_ITEMS = Object.freeze([
  {
    "id": "xlsx-001",
    "category": "sound_pa",
    "subcategory": "сабвуферы",
    "type": "sound",
    "code": "SND-002",
    "name": "FBT MUSE 218 SND Активный сабвуфер, 4000 Вт., 2x18\", Dante",
    "unit": "шт",
    "stockQty": 6,
    "reservedQty": 0,
    "weightKg": 99,
    "powerW": 800,
    "rentalPrice": 6000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 1,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 3.636,
      "ratedPowerW": 4000,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-001",
      "legacyCodes": [
        "XLSX-001"
      ]
    }
  },
  {
    "id": "xlsx-002",
    "category": "sound_pa",
    "subcategory": "line array",
    "type": "sound",
    "code": "SND-003",
    "name": "FBT MUSE 210 LA актив. элемент линейного массива, бас-рефлекс, 600+300 Вт RMS, 135 дБ.Звуковое давление (max) дБ:135.Мощность (RMS):600 Вт. Частотный диапазон:55 — 20 000 Гц.",
    "unit": "шт",
    "stockQty": 14,
    "reservedQty": 0,
    "weightKg": 38,
    "powerW": 650,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 2,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 2.955,
      "ratedPowerW": 900,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-002",
      "legacyCodes": [
        "XLSX-002"
      ]
    }
  },
  {
    "id": "xlsx-003",
    "category": "sound_pa",
    "subcategory": "сабвуферы",
    "type": "sound",
    "code": "SND-004",
    "name": "FBT MUSE 118FSA Активный сабвуфер, 1200 Вт., 18\"",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 67,
    "powerW": 650,
    "rentalPrice": 4000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 3,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 2.955,
      "ratedPowerW": 1200,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-003",
      "legacyCodes": [
        "XLSX-003"
      ]
    }
  },
  {
    "id": "xlsx-004",
    "category": "sound_pa",
    "subcategory": "line array",
    "type": "sound",
    "code": "SND-005",
    "name": "FBT MS-F 210 Рама для подвеса АС MUSE 210",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 30,
    "powerW": 0,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 4,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-004",
      "legacyCodes": [
        "XLSX-004"
      ]
    }
  },
  {
    "id": "xlsx-005",
    "category": "sound_pa",
    "subcategory": "line array",
    "type": "sound",
    "code": "SND-006",
    "name": "FBT SP210 Рама для установки АС MUSE 210 на трубу монототема",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 13,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 5,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-005",
      "legacyCodes": [
        "XLSX-005"
      ]
    }
  },
  {
    "id": "xlsx-006",
    "category": "sound_pa",
    "subcategory": "front fill",
    "type": "sound",
    "code": "SND-007",
    "name": "RCF ART 715-A MK4 Активная двухполосная акустическая система",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 20,
    "powerW": 250,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 6,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 1.136,
      "ratedPowerW": 1400,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-006",
      "legacyCodes": [
        "XLSX-006"
      ]
    }
  },
  {
    "id": "xlsx-007",
    "category": "sound_pa",
    "subcategory": "сабвуферы",
    "type": "sound",
    "code": "SND-008",
    "name": "RCF SUB 708-AS II Сабвуфер активного типа 700Вт.",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 38,
    "powerW": 250,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 7,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 1.136,
      "ratedPowerW": 700,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-007",
      "legacyCodes": [
        "XLSX-007"
      ]
    }
  },
  {
    "id": "xlsx-008",
    "category": "sound_pa",
    "subcategory": "front fill",
    "type": "sound",
    "code": "SND-009",
    "name": "JBL EON315 Акустическая система",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 16,
    "powerW": 250,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 8,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 1.136,
      "ratedPowerW": 300,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-008",
      "legacyCodes": [
        "XLSX-008"
      ]
    }
  },
  {
    "id": "xlsx-009",
    "category": "sound_pa",
    "subcategory": "сабвуферы",
    "type": "sound",
    "code": "SND-010",
    "name": "JBL EON518S Активный сабвуфер",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 30,
    "powerW": 250,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Звук Сила",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 9,
      "excelCategory": "Звук Сила",
      "status": "Активна",
      "currentA": 1.136,
      "ratedPowerW": 500,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-009",
      "legacyCodes": [
        "XLSX-009"
      ]
    }
  },
  {
    "id": "xlsx-010",
    "category": "monitoring",
    "subcategory": "wedge",
    "type": "sound",
    "code": "MON-001",
    "name": "FBT X PRO 112 MA Активный сценический монитор, 1500 Вт., 12\" Wood",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 16,
    "powerW": 500,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Мониторы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 10,
      "excelCategory": "Мониторы",
      "status": "Активна",
      "currentA": 2.273,
      "ratedPowerW": 1500,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-010",
      "legacyCodes": [
        "XLSX-010"
      ]
    }
  },
  {
    "id": "xlsx-011",
    "category": "monitoring",
    "subcategory": "wedge",
    "type": "sound",
    "code": "MON-002",
    "name": "FBT StageMaxX 12MA Активный сценический монитор, 500 Вт., 12\"",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 15,
    "powerW": 450,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Мониторы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 11,
      "excelCategory": "Мониторы",
      "status": "Активна",
      "currentA": 2.045,
      "ratedPowerW": 500,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-011",
      "legacyCodes": [
        "XLSX-011"
      ]
    }
  },
  {
    "id": "xlsx-012",
    "category": "monitoring",
    "subcategory": "wedge",
    "type": "sound",
    "code": "MON-003",
    "name": "Electro-Voice ELX112P активная 12\" акустическая система",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 19,
    "powerW": 500,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Мониторы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 12,
      "excelCategory": "Мониторы",
      "status": "Активна",
      "currentA": 2.273,
      "ratedPowerW": 1000,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-012",
      "legacyCodes": [
        "XLSX-012"
      ]
    }
  },
  {
    "id": "xlsx-013",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-002",
    "name": "Allen & Heath DLive C3500 (DLIVE-DLC35) Цифровой микшерный пульт",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 36,
    "powerW": 75,
    "rentalPrice": 15000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 13,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.341,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-013",
      "legacyCodes": [
        "XLSX-013"
      ]
    }
  },
  {
    "id": "xlsx-014",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-003",
    "name": "Allen & Heath DLive-CDM48 Цифровой микшерный модуль, 48x24",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 18,
    "powerW": 175,
    "rentalPrice": 20000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 14,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.795,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-014",
      "legacyCodes": [
        "XLSX-014"
      ]
    }
  },
  {
    "id": "xlsx-015",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-004",
    "name": "Allen & Heath DLIVE-M-DL-DANT64-A (M-DL-DANT64-AX) Карта Dante для систем dLive, 64x64",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 15,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-015",
      "legacyCodes": [
        "XLSX-015"
      ]
    }
  },
  {
    "id": "xlsx-016",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-005",
    "name": "Сетевая аудио карта Allen&Heath DLIVE-M-DL-WAVES-V3",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 16,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-016",
      "legacyCodes": [
        "XLSX-016"
      ]
    }
  },
  {
    "id": "xlsx-017",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-006",
    "name": "Аудио интерфейс SuperMADI Allen&Heath DLIVE-M-DL-SMADI",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 17,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-017",
      "legacyCodes": [
        "XLSX-017"
      ]
    }
  },
  {
    "id": "xlsx-018",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-007",
    "name": "Allen & Heath DLIVE-M-DL-GACE-A (M-DL-GACE-AX) Карта gigaACE для систем dLive, 128x128",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 18,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-018",
      "legacyCodes": [
        "XLSX-018"
      ]
    }
  },
  {
    "id": "xlsx-019",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-008",
    "name": "BEHRINGER X32 Цифровой микшерный пульт",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 25,
    "powerW": 1200,
    "rentalPrice": 6000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 19,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 5.455,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-019",
      "legacyCodes": [
        "XLSX-019"
      ]
    }
  },
  {
    "id": "xlsx-020",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-009",
    "name": "BEHRINGER X32  rack Цифровой микшерный пульт",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 7,
    "powerW": 120,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 20,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.545,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-020",
      "legacyCodes": [
        "XLSX-020"
      ]
    }
  },
  {
    "id": "xlsx-021",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-010",
    "name": "BEHRINGER WING rack Цифровой микшерный пульт",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 10,
    "powerW": 130,
    "rentalPrice": 8000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 21,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.591,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-021",
      "legacyCodes": [
        "XLSX-021"
      ]
    }
  },
  {
    "id": "xlsx-022",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-011",
    "name": "Midas DL32 stageBox",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 6,
    "powerW": 55,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 22,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.25,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-022",
      "legacyCodes": [
        "XLSX-022"
      ]
    }
  },
  {
    "id": "xlsx-023",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-012",
    "name": "YAMAHA MG12XU Аналоговый Микшерный пульт",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 5,
    "powerW": 22,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 23,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.1,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-023",
      "legacyCodes": [
        "XLSX-023"
      ]
    }
  },
  {
    "id": "xlsx-024",
    "category": "consoles",
    "subcategory": "микшерные пульты",
    "type": "sound",
    "code": "MIX-013",
    "name": "Allen & Heath ZED-12FX (ZED12FX) 12-канальный аналоговый микшер",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 7,
    "powerW": 30,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микшерные пульты",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 24,
      "excelCategory": "Микшерные пульты",
      "status": "Активна",
      "currentA": 0.136,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-024",
      "legacyCodes": [
        "XLSX-024"
      ]
    }
  },
  {
    "id": "xlsx-025",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-001",
    "name": "TAMA starclassic performer Birch/Maple ударная установка из 4 барабанов (18х22 бочка, 8х10, 9х12 томы, 14х16 напольный том, mth909 том-холдер) (цвет -красный берст)",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 10000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 25,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-025",
      "legacyCodes": [
        "XLSX-025"
      ]
    }
  },
  {
    "id": "xlsx-026",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-002",
    "name": "Yamaha Live Custom Hybrid Oak цвет синий берст, установка из 5ти барабанов (22’’, 16’’, 14’’, 12’’, 10’’)",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 12000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 26,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-026",
      "legacyCodes": [
        "XLSX-026"
      ]
    }
  },
  {
    "id": "xlsx-027",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-003",
    "name": "Zildjian A Custom Комплект 14/16/18/20\" Cymbal Pack",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 8000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 27,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-027",
      "legacyCodes": [
        "XLSX-027"
      ]
    }
  },
  {
    "id": "xlsx-028",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-004",
    "name": "Тарелки Zildjian K Custom Dark Комплект 14/16/18/20\"",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 10000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 28,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-028",
      "legacyCodes": [
        "XLSX-028"
      ]
    }
  },
  {
    "id": "xlsx-029",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-005",
    "name": "Zildjian K Custom Dark splash 8\"",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 29,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-029",
      "legacyCodes": [
        "XLSX-029"
      ]
    }
  },
  {
    "id": "xlsx-030",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-006",
    "name": "Zildjian K Custom Dark splash 10\"",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 30,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-030",
      "legacyCodes": [
        "XLSX-030"
      ]
    }
  },
  {
    "id": "xlsx-031",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-007",
    "name": "Zildjian S 14/16/18/20\" Performer Set (S390) Комплект тарелок",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 31,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-031",
      "legacyCodes": [
        "XLSX-031"
      ]
    }
  },
  {
    "id": "xlsx-032",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-008",
    "name": "TAMA HT430B Round Rider Drum Throne Барабанный стул Винтовой",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 32,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-032",
      "legacyCodes": [
        "XLSX-032"
      ]
    }
  },
  {
    "id": "xlsx-033",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-009",
    "name": "TAMA Iron cobra HP600 педаль для бас барабана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 33,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-033",
      "legacyCodes": [
        "XLSX-033"
      ]
    }
  },
  {
    "id": "xlsx-034",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-010",
    "name": "TAMA Iron cobra HP900 педаль для бас барабана",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 34,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-034",
      "legacyCodes": [
        "XLSX-034"
      ]
    }
  },
  {
    "id": "xlsx-035",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-011",
    "name": "TAMA Iron cobra HP900 двойная педаль для бас барабана",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 8000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 35,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-035",
      "legacyCodes": [
        "XLSX-035"
      ]
    }
  },
  {
    "id": "xlsx-036",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-012",
    "name": "Pearl P-1030 Педаль для бас барабана Eliminator Solo Black. Привод двойная цепь.",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 36,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-036",
      "legacyCodes": [
        "XLSX-036"
      ]
    }
  },
  {
    "id": "xlsx-037",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-013",
    "name": "Yamaha maple custom MSD series малый барабан 14х6.5 (Япония)",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 8000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 37,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-037",
      "legacyCodes": [
        "XLSX-037"
      ]
    }
  },
  {
    "id": "xlsx-038",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-014",
    "name": "Taye drums tour pro 14x5.5 Малый барабан 14х5,5 береза/тополь",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 38,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-038",
      "legacyCodes": [
        "XLSX-038"
      ]
    }
  },
  {
    "id": "xlsx-039",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-015",
    "name": "TAMA HC83BW ROADPRO BOOM CYMBAL STAND Стойка для тарелки, журавль",
    "unit": "шт",
    "stockQty": 8,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 39,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-039",
      "legacyCodes": [
        "XLSX-039"
      ]
    }
  },
  {
    "id": "xlsx-040",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-016",
    "name": "TAMA HC43BWN STAGE MASTER Стойка для тарелки, журавль",
    "unit": "шт",
    "stockQty": 8,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 40,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-040",
      "legacyCodes": [
        "XLSX-040"
      ]
    }
  },
  {
    "id": "xlsx-041",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-017",
    "name": "TAMA HH605 стойка для хай-хета",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 41,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-041",
      "legacyCodes": [
        "XLSX-041"
      ]
    }
  },
  {
    "id": "xlsx-042",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-018",
    "name": "TAMA HS80W ROADPRO SNARE STAND Стойка для малого барабана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 42,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-042",
      "legacyCodes": [
        "XLSX-042"
      ]
    }
  },
  {
    "id": "xlsx-043",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-019",
    "name": "TAMA HS800W ROADPRO SNARE STAND  Стойка для малого барабана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 43,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-043",
      "legacyCodes": [
        "XLSX-043"
      ]
    }
  },
  {
    "id": "xlsx-044",
    "category": "backline",
    "subcategory": "барабаны",
    "type": "manual",
    "code": "BKL-020",
    "name": "Pearl S-930 Стойка для малого барабана",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Барабаны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 44,
      "excelCategory": "Барабаны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-044",
      "legacyCodes": [
        "XLSX-044"
      ]
    }
  },
  {
    "id": "xlsx-045",
    "category": "backline",
    "subcategory": "гитарное усиление",
    "type": "sound",
    "code": "BKL-021",
    "name": "Markbass Standard 104HR 4Ом. Басовый кабинет, 800 Вт., 4х10\"",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 22,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Гитарное Усиление",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 45,
      "excelCategory": "Гитарное Усиление",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 800,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-045",
      "legacyCodes": [
        "XLSX-045"
      ]
    }
  },
  {
    "id": "xlsx-046",
    "category": "backline",
    "subcategory": "гитарное усиление",
    "type": "sound",
    "code": "BKL-022",
    "name": "Markbass Little Mark 800 Tube Басовый усилитель, 800 Вт.",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 3,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Гитарное Усиление",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 46,
      "excelCategory": "Гитарное Усиление",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 800,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-046",
      "legacyCodes": [
        "XLSX-046"
      ]
    }
  },
  {
    "id": "xlsx-047",
    "category": "backline",
    "subcategory": "гитарное усиление",
    "type": "sound",
    "code": "BKL-023",
    "name": "Fender Hot Rod DeVille 212 IV Гитарный ламповый комбоусилитель, 60 Вт., 2х12\"",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 25,
    "powerW": 0,
    "rentalPrice": 10000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Гитарное Усиление",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 47,
      "excelCategory": "Гитарное Усиление",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 60,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-047",
      "legacyCodes": [
        "XLSX-047"
      ]
    }
  },
  {
    "id": "xlsx-048",
    "category": "monitoring",
    "subcategory": "iem",
    "type": "sound",
    "code": "MON-004",
    "name": "Shure Psm1000 + p10r+",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "IEM",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 48,
      "excelCategory": "IEM",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-048",
      "legacyCodes": [
        "XLSX-048"
      ]
    }
  },
  {
    "id": "xlsx-049",
    "category": "monitoring",
    "subcategory": "iem",
    "type": "sound",
    "code": "MON-005",
    "name": "Shure PA421B Antenna Combiners",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "IEM",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 49,
      "excelCategory": "IEM",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-049",
      "legacyCodes": [
        "XLSX-049"
      ]
    }
  },
  {
    "id": "xlsx-050",
    "category": "monitoring",
    "subcategory": "iem",
    "type": "sound",
    "code": "MON-006",
    "name": "SENNHEISER EW IEM G4",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "IEM",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 50,
      "excelCategory": "IEM",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-050",
      "legacyCodes": [
        "XLSX-050"
      ]
    }
  },
  {
    "id": "xlsx-051",
    "category": "monitoring",
    "subcategory": "iem",
    "type": "sound",
    "code": "MON-007",
    "name": "AC 41-EU SENNHEISER Антенный сумматор для радиосистем",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "IEM",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 51,
      "excelCategory": "IEM",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-051",
      "legacyCodes": [
        "XLSX-051"
      ]
    }
  },
  {
    "id": "xlsx-052",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-024",
    "name": "Shure Ulxd4E G51 B58 микрофонная радиосистема с Ручным микрофоном Beta58 470-534 MHz",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 5000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 52,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-052",
      "legacyCodes": [
        "XLSX-052"
      ]
    }
  },
  {
    "id": "xlsx-053",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-025",
    "name": "Shure Qlxd B58 микрофонная радиосистема с Ручным микрофоном Beta58",
    "unit": "шт",
    "stockQty": 6,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 53,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-053",
      "legacyCodes": [
        "XLSX-053"
      ]
    }
  },
  {
    "id": "xlsx-054",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-026",
    "name": "Shure Slxd B58 микрофонная радиосистема с Ручным микрофоном Beta58",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 54,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-054",
      "legacyCodes": [
        "XLSX-054"
      ]
    }
  },
  {
    "id": "xlsx-055",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-027",
    "name": "Shure Slx SM58 микрофонная радиосистема с Ручным микрофоном SM58",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 55,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-055",
      "legacyCodes": [
        "XLSX-055"
      ]
    }
  },
  {
    "id": "xlsx-056",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-028",
    "name": "Shure Blx PG58 микрофонная радиосистема с Ручным микрофоном PG58",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 56,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-056",
      "legacyCodes": [
        "XLSX-056"
      ]
    }
  },
  {
    "id": "xlsx-057",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-029",
    "name": "SHURE UA845UWB/LC-E Активный сплиттер для приемников",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 57,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-057",
      "legacyCodes": [
        "XLSX-057"
      ]
    }
  },
  {
    "id": "xlsx-058",
    "category": "backline",
    "subcategory": "радиосистемы",
    "type": "sound",
    "code": "BKL-030",
    "name": "Leicozic UA845 Антенный распределитель сигнала",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Микрофонные Радиосистемы",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 58,
      "excelCategory": "Микрофонные Радиосистемы",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-058",
      "legacyCodes": [
        "XLSX-058"
      ]
    }
  },
  {
    "id": "xlsx-059",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-031",
    "name": "Shure Sm58 lce Шнуровой вокальный микрофон с выключателем",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 59,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-059",
      "legacyCodes": [
        "XLSX-059"
      ]
    }
  },
  {
    "id": "xlsx-060",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-032",
    "name": "Shure Beta58 шнуровой вокальный микрофон",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 600,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 60,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-060",
      "legacyCodes": [
        "XLSX-060"
      ]
    }
  },
  {
    "id": "xlsx-061",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-033",
    "name": "Shure beta 52 Инструментальный микрофон для Басс барабана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 61,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-061",
      "legacyCodes": [
        "XLSX-061"
      ]
    }
  },
  {
    "id": "xlsx-062",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-034",
    "name": "Shure Beta 91A инструментальный микрофон для Басс барабана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 62,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-062",
      "legacyCodes": [
        "XLSX-062"
      ]
    }
  },
  {
    "id": "xlsx-063",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-035",
    "name": "Shure SM81 Конденсаторный Инструментальный микрофон",
    "unit": "шт",
    "stockQty": 4,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 63,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-063",
      "legacyCodes": [
        "XLSX-063"
      ]
    }
  },
  {
    "id": "xlsx-064",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-036",
    "name": "Shure SM57 Инструментальный микрофон",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 64,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-064",
      "legacyCodes": [
        "XLSX-064"
      ]
    }
  },
  {
    "id": "xlsx-065",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-037",
    "name": "AKG 112 Инструментальный микрофон",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 65,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-065",
      "legacyCodes": [
        "XLSX-065"
      ]
    }
  },
  {
    "id": "xlsx-066",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-038",
    "name": "Sennhiser e904 Инструментальный микрофон",
    "unit": "шт",
    "stockQty": 8,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 600,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 66,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-066",
      "legacyCodes": [
        "XLSX-066"
      ]
    }
  },
  {
    "id": "xlsx-067",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-039",
    "name": "Sennhiser e906 Инструментальный микрофон (guitar)",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 67,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-067",
      "legacyCodes": [
        "XLSX-067"
      ]
    }
  },
  {
    "id": "xlsx-068",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-040",
    "name": "Sennhiser e902 Инструментальный микрофон для Басс барабана",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 68,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-068",
      "legacyCodes": [
        "XLSX-068"
      ]
    }
  },
  {
    "id": "xlsx-069",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-041",
    "name": "Sennhiser e914 Конденсаторный Инструментальный микрофон",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 800,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 69,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-069",
      "legacyCodes": [
        "XLSX-069"
      ]
    }
  },
  {
    "id": "xlsx-070",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-042",
    "name": "Sennheiser MKE 600 (пушка)",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 2000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 70,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-070",
      "legacyCodes": [
        "XLSX-070"
      ]
    }
  },
  {
    "id": "xlsx-071",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-043",
    "name": "Audix D6 инструментальный микрофон для Басс барабана",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 71,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-071",
      "legacyCodes": [
        "XLSX-071"
      ]
    }
  },
  {
    "id": "xlsx-072",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-044",
    "name": "Audix i5 инструментальный микрофон",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 72,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-072",
      "legacyCodes": [
        "XLSX-072"
      ]
    }
  },
  {
    "id": "xlsx-073",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-045",
    "name": "Audix D4 инструментальный микрофон",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 73,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-073",
      "legacyCodes": [
        "XLSX-073"
      ]
    }
  },
  {
    "id": "xlsx-074",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-046",
    "name": "Audix D2 инструментальный микрофон",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 74,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-074",
      "legacyCodes": [
        "XLSX-074"
      ]
    }
  },
  {
    "id": "xlsx-075",
    "category": "backline",
    "subcategory": "микрофоны",
    "type": "sound",
    "code": "BKL-047",
    "name": "Audix ADX51 Конденсаторный инструментальный микрофон",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 800,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Шнуроввые микрофоны",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 75,
      "excelCategory": "Шнуроввые микрофоны",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-075",
      "legacyCodes": [
        "XLSX-075"
      ]
    }
  },
  {
    "id": "xlsx-076",
    "category": "sound_pa",
    "subcategory": "процессоры/ибп",
    "type": "sound",
    "code": "SND-011",
    "name": "Контур Аудио P48 Контроллер акустических систем",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 5,
    "powerW": 20,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "ПА проц, ИБП",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 76,
      "excelCategory": "ПА проц, ИБП",
      "status": "Активна",
      "currentA": 0.091,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-076",
      "legacyCodes": [
        "XLSX-076"
      ]
    }
  },
  {
    "id": "xlsx-077",
    "category": "sound_pa",
    "subcategory": "процессоры/ибп",
    "type": "sound",
    "code": "SND-012",
    "name": "Electro-Voice DC-one Контроллер акустических систем",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 5,
    "powerW": 25,
    "rentalPrice": 1000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "ПА проц, ИБП",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 77,
      "excelCategory": "ПА проц, ИБП",
      "status": "Активна",
      "currentA": 0.114,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-077",
      "legacyCodes": [
        "XLSX-077"
      ]
    }
  },
  {
    "id": "xlsx-078",
    "category": "sound_pa",
    "subcategory": "процессоры/ибп",
    "type": "sound",
    "code": "SND-013",
    "name": "Импульс Фристайл 1500 Источник бесперебойного питания",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 14,
    "powerW": 25,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "ПА проц, ИБП",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 78,
      "excelCategory": "ПА проц, ИБП",
      "status": "Активна",
      "currentA": 0.114,
      "ratedPowerW": 1350,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-078",
      "legacyCodes": [
        "XLSX-078"
      ]
    }
  },
  {
    "id": "xlsx-079",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-048",
    "name": "K&M 23200-300-55 Настольная микрофонная стойка с круглым основанием, 175 мм.",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 79,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-079",
      "legacyCodes": [
        "XLSX-079"
      ]
    }
  },
  {
    "id": "xlsx-080",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-049",
    "name": "K&M 25500-300-55 Микрофонная стойка типа журавль односекционная (Средняя)",
    "unit": "шт",
    "stockQty": 6,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 80,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-080",
      "legacyCodes": [
        "XLSX-080"
      ]
    }
  },
  {
    "id": "xlsx-081",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-050",
    "name": "K&M 25950-300-55 Микрофонная стойка типа журавль односекционная (Низкая)",
    "unit": "шт",
    "stockQty": 3,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 81,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-081",
      "legacyCodes": [
        "XLSX-081"
      ]
    }
  },
  {
    "id": "xlsx-082",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-051",
    "name": "K&M 26010-300-55 Прямая микрофонная стойка, двухсекционная, телескопическая",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 82,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-082",
      "legacyCodes": [
        "XLSX-082"
      ]
    }
  },
  {
    "id": "xlsx-083",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-052",
    "name": "K&M 25400-300-55 микрофонная стойка",
    "unit": "шт",
    "stockQty": 10,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 83,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-083",
      "legacyCodes": [
        "XLSX-083"
      ]
    }
  },
  {
    "id": "xlsx-084",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-053",
    "name": "Hercules MS201B Plus Стойка микрофонная прямая",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 84,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-084",
      "legacyCodes": [
        "XLSX-084"
      ]
    }
  },
  {
    "id": "xlsx-085",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-054",
    "name": "K&M 11940-000-55 Пюпитр оркестровый с быстросъемным нотным держателем, черный, 740-1270 мм",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 3.9,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 85,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-085",
      "legacyCodes": [
        "XLSX-085"
      ]
    }
  },
  {
    "id": "xlsx-086",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-055",
    "name": "K&M 12185-000-55 Стойка для ноутбука, высота 700-1250, цвет черный",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 86,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-086",
      "legacyCodes": [
        "XLSX-086"
      ]
    }
  },
  {
    "id": "xlsx-087",
    "category": "backline",
    "subcategory": "стойки",
    "type": "manual",
    "code": "BKL-056",
    "name": "K&M 13500-000-55 Перкуссионный стол",
    "unit": "шт",
    "stockQty": 1,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 0,
    "rentalPrice": 700,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Стойки, пюпитры",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 87,
      "excelCategory": "Стойки, пюпитры",
      "status": "Активна",
      "currentA": 0,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-087",
      "legacyCodes": [
        "XLSX-087"
      ]
    }
  },
  {
    "id": "xlsx-088",
    "category": "light",
    "subcategory": "световые приборы",
    "type": "light_fixture",
    "code": "LGT-002",
    "name": "LED COB bar 14-30 Светодиодный прожектор LED RGB, 420 Вт",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 420,
    "rentalPrice": 750,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 88,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 1.909,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-088",
      "legacyCodes": [
        "XLSX-088"
      ]
    }
  },
  {
    "id": "xlsx-089",
    "category": "light",
    "subcategory": "beam",
    "type": "light_fixture",
    "code": "LGT-003",
    "name": "Beam 7R Световой прибор «Голова» с узким лучом 230 Вт (7R)",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 230,
    "rentalPrice": 1750,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 89,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 1.045,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-089",
      "legacyCodes": [
        "XLSX-089"
      ]
    }
  },
  {
    "id": "xlsx-090",
    "category": "light",
    "subcategory": "световые приборы",
    "type": "light_fixture",
    "code": "LGT-004",
    "name": "Wash RGBW 36x10 Световой прибор заливочный «Голова»",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 200,
    "rentalPrice": 1750,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 90,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 0.909,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-090",
      "legacyCodes": [
        "XLSX-090"
      ]
    }
  },
  {
    "id": "xlsx-091",
    "category": "light",
    "subcategory": "beam",
    "type": "light_fixture",
    "code": "LGT-005",
    "name": "Beam /Spot BSW400 Световой прибор Beam/Spot 400 Вт",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 400,
    "rentalPrice": 2750,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 91,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 1.818,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-091",
      "legacyCodes": [
        "XLSX-091"
      ]
    }
  },
  {
    "id": "xlsx-092",
    "category": "light",
    "subcategory": "blinder",
    "type": "light_fixture",
    "code": "LGT-006",
    "name": "Led Blind 100x2 Светодиодный прожектор типа Blinder",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 200,
    "rentalPrice": 600,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 92,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 0.909,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-092",
      "legacyCodes": [
        "XLSX-092"
      ]
    }
  },
  {
    "id": "xlsx-093",
    "category": "light",
    "subcategory": "dmx/artnet",
    "type": "light_fixture",
    "code": "LGT-007",
    "name": "MA2 onPC command wing Командное крыло для управления световыми приборами",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 65,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 93,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 0.295,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-093",
      "legacyCodes": [
        "XLSX-093"
      ]
    }
  },
  {
    "id": "xlsx-094",
    "category": "light",
    "subcategory": "спецэффекты",
    "type": "light_fixture",
    "code": "LGT-008",
    "name": "Robe 500ft Генератор тумана",
    "unit": "шт",
    "stockQty": 2,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 750,
    "rentalPrice": 3000,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 94,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 3.409,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-094",
      "legacyCodes": [
        "XLSX-094"
      ]
    }
  },
  {
    "id": "xlsx-095",
    "category": "light",
    "subcategory": "спецэффекты",
    "type": "light_fixture",
    "code": "LGT-009",
    "name": "MLB QF-M7 Дым машина с вертикальным выбросом дыма. БЕЗ ЖИДКОСТИ",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 1500,
    "rentalPrice": 3500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 95,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 6.818,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-095",
      "legacyCodes": [
        "XLSX-095"
      ]
    }
  },
  {
    "id": "xlsx-096",
    "category": "light",
    "subcategory": "dmx/artnet",
    "type": "light_fixture",
    "code": "LGT-010",
    "name": "American DJ Entour Cyclone Сценический вентилятор профессионального уровня с управлением по DMX",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 250,
    "rentalPrice": 600,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 96,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 1.136,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-096",
      "legacyCodes": [
        "XLSX-096"
      ]
    }
  },
  {
    "id": "xlsx-097",
    "category": "light",
    "subcategory": "dmx/artnet",
    "type": "light_fixture",
    "code": "LGT-011",
    "name": "WI-DMX Система беспроводной передачи данных DMX",
    "unit": "шт",
    "stockQty": 0,
    "reservedQty": 0,
    "weightKg": 0,
    "powerW": 60,
    "rentalPrice": 2500,
    "replacementCost": 0,
    "isActive": true,
    "sourceType": "own",
    "supplierName": "Свет",
    "meta": {
      "excelSource": "FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx",
      "excelId": 97,
      "excelCategory": "Свет",
      "status": "Активна",
      "currentA": 0.273,
      "ratedPowerW": 0,
      "codeSeries": "category-prefix-v1",
      "legacyCode": "XLSX-097",
      "legacyCodes": [
        "XLSX-097"
      ]
    }
  }
]);

  const DEMO_EQUIPMENT_ITEMS = Object.freeze([
    {"id": "eq-stage-deck-2x1", "category": "stage", "subcategory": "настил", "type": "stage_deck", "code": "STG-001", "name": "Сценический настил 2×1 м", "unit": "шт", "stockQty": 48, "reservedQty": 0, "weightKg": 36, "powerW": 0, "rentalPrice": 700, "replacementCost": 45000, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "ST-2x1", "legacyCodes": ["ST-2x1"]}},
    {"id": "eq-stage-leg", "category": "stage", "subcategory": "опоры", "type": "stage_part", "code": "STG-002", "name": "Опора сцены регулируемая", "unit": "шт", "stockQty": 220, "reservedQty": 0, "weightKg": 3.8, "powerW": 0, "rentalPrice": 60, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LEG", "legacyCodes": ["LEG"]}},
    {"id": "eq-truss-3m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-001", "name": "Ферма 3 м", "unit": "шт", "stockQty": 32, "reservedQty": 4, "weightKg": 21, "powerW": 0, "rentalPrice": 650, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-3.0", "legacyCodes": ["TR-3.0"]}},
    {"id": "eq-truss-2m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-002", "name": "Ферма 2 м", "unit": "шт", "stockQty": 20, "reservedQty": 0, "weightKg": 14, "powerW": 0, "rentalPrice": 500, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-2.0", "legacyCodes": ["TR-2.0"]}},
    {"id": "eq-c288", "category": "truss", "subcategory": "коннекторы", "type": "truss_connector", "code": "TRS-003", "name": "Конусный коннектор C2-88", "unit": "шт", "stockQty": 300, "reservedQty": 0, "weightKg": 0.25, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "C2-88", "legacyCodes": ["C2-88"]}},
    {"id": "eq-c383", "category": "truss", "subcategory": "коннекторы", "type": "truss_connector", "code": "TRS-004", "name": "Полуконнектор конусный C3-83", "unit": "шт", "stockQty": 160, "reservedQty": 0, "weightKg": 0.27, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "C3-83", "legacyCodes": ["C3-83"]}},
    {"id": "eq-led-500-p3", "category": "led", "subcategory": "кабинеты", "type": "led_cabinet", "code": "LED-001", "name": "LED кабинет 500×500 P3", "unit": "шт", "stockQty": 96, "reservedQty": 0, "weightKg": 7.5, "powerW": 160, "rentalPrice": 850, "replacementCost": 52000, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LED-500-P3", "legacyCodes": ["LED-500-P3"]}},
    {"id": "eq-led-640-p4", "category": "led", "subcategory": "кабинеты", "type": "led_cabinet", "code": "LED-002", "name": "LED кабинет 640×640 P4", "unit": "шт", "stockQty": 80, "reservedQty": 0, "weightKg": 14, "powerW": 320, "startupPowerW": 600, "rentalPrice": 1000, "replacementCost": 65000, "meta": {"pixelsX": 160, "pixelsY": 160, "codeSeries": "category-prefix-v1", "legacyCode": "LED-640-P4", "legacyCodes": ["LED-640-P4"]}},
    {"id": "eq-led-rj45", "category": "led", "subcategory": "сигнал", "type": "cable", "code": "LED-003", "name": "Линк RJ45 для LED", "unit": "шт", "stockQty": 130, "reservedQty": 0, "weightKg": 0.2, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "RJ45-LINK", "legacyCodes": ["RJ45-LINK"]}},
    {"id": "eq-led-powercon-schuko", "category": "led", "subcategory": "питание", "type": "cable", "code": "LED-004", "name": "Провод PowerCON–Schuko", "unit": "шт", "stockQty": 40, "reservedQty": 0, "weightKg": 0.75, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "POWERCON-SCHUKO", "legacyCodes": ["POWERCON-SCHUKO"]}},
    {"id": "eq-led-leg-3m", "category": "led", "subcategory": "крепёж", "type": "led_accessory", "code": "LED-005", "name": "Нога LED 3 м", "unit": "шт", "stockQty": 24, "reservedQty": 0, "weightKg": 4, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LED-LEG-3M", "legacyCodes": ["LED-LEG-3M"]}},
    {"id": "eq-led-leg-25m", "category": "led", "subcategory": "крепёж", "type": "led_accessory", "code": "LED-006", "name": "Нога LED 2,5 м", "unit": "шт", "stockQty": 24, "reservedQty": 0, "weightKg": 3.6, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LED-LEG-2.5M", "legacyCodes": ["LED-LEG-2.5M"]}},
    {"id": "eq-led-leg-2m", "category": "led", "subcategory": "крепёж", "type": "led_accessory", "code": "LED-007", "name": "Нога LED 2 м", "unit": "шт", "stockQty": 24, "reservedQty": 0, "weightKg": 3, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LED-LEG-2M", "legacyCodes": ["LED-LEG-2M"]}},
    {"id": "eq-stage-leg-2m", "category": "stage", "subcategory": "опоры", "type": "stage_support", "code": "STG-003", "name": "Нога сцены 2 м", "unit": "шт", "stockQty": 40, "reservedQty": 0, "weightKg": 3, "powerW": 0, "rentalPrice": 60, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "ST-LEG-2M", "legacyCodes": ["ST-LEG-2M"]}},
    {"id": "eq-stage-leg-25m", "category": "stage", "subcategory": "опоры", "type": "stage_support", "code": "STG-004", "name": "Нога сцены 2,5 м", "unit": "шт", "stockQty": 36, "reservedQty": 0, "weightKg": 3.6, "powerW": 0, "rentalPrice": 70, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "ST-LEG-2.5M", "legacyCodes": ["ST-LEG-2.5M"]}},
    {"id": "eq-stage-leg-3m", "category": "stage", "subcategory": "опоры", "type": "stage_support", "code": "STG-005", "name": "Нога сцены 3 м", "unit": "шт", "stockQty": 32, "reservedQty": 0, "weightKg": 4, "powerW": 0, "rentalPrice": 80, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "ST-LEG-3M", "legacyCodes": ["ST-LEG-3M"]}},
    {"id": "eq-truss-05m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-005", "name": "Ферма 0,5 м", "unit": "шт", "stockQty": 12, "reservedQty": 0, "weightKg": 4.2, "powerW": 0, "rentalPrice": 250, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-0.5", "legacyCodes": ["TR-0.5"]}},
    {"id": "eq-truss-1m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-006", "name": "Ферма 1 м", "unit": "шт", "stockQty": 16, "reservedQty": 0, "weightKg": 7.2, "powerW": 0, "rentalPrice": 350, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-1.0", "legacyCodes": ["TR-1.0"]}},
    {"id": "eq-truss-15m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-007", "name": "Ферма 1,5 м", "unit": "шт", "stockQty": 14, "reservedQty": 0, "weightKg": 10.5, "powerW": 0, "rentalPrice": 430, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-1.5", "legacyCodes": ["TR-1.5"]}},
    {"id": "eq-truss-25m", "category": "truss", "subcategory": "прямые фермы", "type": "truss_segment", "code": "TRS-008", "name": "Ферма 2,5 м", "unit": "шт", "stockQty": 18, "reservedQty": 0, "weightKg": 17.5, "powerW": 0, "rentalPrice": 580, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-2.5", "legacyCodes": ["TR-2.5"]}},
    {"id": "eq-truss-corner-90", "category": "truss", "subcategory": "углы", "type": "truss_node", "code": "TRS-009", "name": "Угол фермы 90°", "unit": "шт", "stockQty": 16, "reservedQty": 0, "weightKg": 6.5, "powerW": 0, "rentalPrice": 350, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-CORNER-90", "legacyCodes": ["TR-CORNER-90"]}},
    {"id": "eq-truss-cube", "category": "truss", "subcategory": "кубы", "type": "truss_node", "code": "TRS-010", "name": "Куб фермы", "unit": "шт", "stockQty": 12, "reservedQty": 0, "weightKg": 7.8, "powerW": 0, "rentalPrice": 400, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-CUBE", "legacyCodes": ["TR-CUBE"]}},
    {"id": "eq-truss-base", "category": "truss", "subcategory": "базы/блины", "type": "truss_base", "code": "TRS-011", "name": "База / блин фермы", "unit": "шт", "stockQty": 24, "reservedQty": 0, "weightKg": 18, "powerW": 0, "rentalPrice": 300, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "TR-BASE", "legacyCodes": ["TR-BASE"]}},
    {"id": "eq-c267", "category": "truss", "subcategory": "коннекторы", "type": "truss_connector", "code": "TRS-012", "name": "Палец C2-67", "unit": "шт", "stockQty": 420, "reservedQty": 0, "weightKg": 0.08, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "C2-67", "legacyCodes": ["C2-67"]}},
    {"id": "eq-splint", "category": "truss", "subcategory": "крепёж", "type": "truss_connector", "code": "TRS-013", "name": "Шплинт", "unit": "шт", "stockQty": 500, "reservedQty": 0, "weightKg": 0.01, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "SPLINT", "legacyCodes": ["SPLINT"]}},
    {"id": "eq-led-link-220", "category": "led", "subcategory": "питание", "type": "cable", "code": "LED-008", "name": "Кабель link 220 для LED", "unit": "шт", "stockQty": 90, "reservedQty": 0, "weightKg": 0.4, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LINK-220", "legacyCodes": ["LINK-220"]}},
    {"id": "eq-led-cookie", "category": "led", "subcategory": "крепёж", "type": "led_accessory", "code": "LED-009", "name": "Скоба / печенька LED", "unit": "шт", "stockQty": 160, "reservedQty": 0, "weightKg": 0.12, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "LED-COOKIE", "legacyCodes": ["LED-COOKIE"]}},
    {"id": "eq-bolt-m8", "category": "led", "subcategory": "крепёж", "type": "led_accessory", "code": "LED-010", "name": "Болт М8", "unit": "шт", "stockQty": 600, "reservedQty": 0, "weightKg": 0.03, "powerW": 0, "rentalPrice": 0, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "BOLT-M8", "legacyCodes": ["BOLT-M8"]}},
    {"id": "eq-light-wash", "category": "light", "subcategory": "wash", "type": "light_fixture", "code": "LGT-001", "name": "LED Wash 19×15W", "unit": "шт", "stockQty": 24, "reservedQty": 0, "weightKg": 9.8, "powerW": 380, "rentalPrice": 1200, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "WASH-19", "legacyCodes": ["WASH-19"]}},
    {"id": "eq-pa-sub", "category": "sound_pa", "subcategory": "сабвуферы", "type": "sound", "code": "SND-001", "name": "Сабвуфер 18” активный", "unit": "шт", "stockQty": 8, "reservedQty": 0, "weightKg": 42, "powerW": 900, "rentalPrice": 1800, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "SUB-18", "legacyCodes": ["SUB-18"]}},
    {"id": "eq-console-dlive", "category": "consoles", "subcategory": "микшерные пульты", "type": "sound", "code": "MIX-001", "name": "Allen&Heath dLive C3500", "unit": "шт", "stockQty": 1, "reservedQty": 0, "weightKg": 18, "powerW": 120, "rentalPrice": 12000, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "DLIVE-C3500", "legacyCodes": ["DLIVE-C3500"]}},
    {"id": "eq-service-tech", "category": "services", "subcategory": "монтажник", "type": "service", "code": "SRV-001", "name": "Техник / монтажник", "unit": "смена", "stockQty": 12, "reservedQty": 0, "weightKg": 0, "powerW": 0, "rentalPrice": 6000, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "CREW-TECH", "legacyCodes": ["CREW-TECH"]}},
    {"id": "eq-xlr-10", "category": "commutation", "subcategory": "xlr", "type": "cable", "code": "COM-001", "name": "Кабель XLR 10 м", "unit": "шт", "stockQty": 70, "reservedQty": 5, "weightKg": 0.6, "powerW": 0, "rentalPrice": 80, "meta": {"codeSeries": "category-prefix-v1", "legacyCode": "XLR-10", "legacyCodes": ["XLR-10"]}},
    ...EXCEL_EQUIPMENT_ITEMS
  ]);

  const EQUIPMENT_CODE_CATALOG_VERSION = 'category-prefix-v1';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDemoUser(role) {
    const normalized = ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) : role;
    return clone(DEMO_USERS[normalized] || DEMO_USERS.viewer);
  }

  function listDemoUsers() {
    return Object.keys(DEMO_USERS).map(getDemoUser);
  }

  ROOT.TestFixtures = {
    DEMO_WORKSPACE_ID,
    DEMO_WORKSPACE_NAME,
    DEMO_USERS,
    DEMO_INVITES,
    DEMO_EQUIPMENT_ITEMS,
    EXCEL_EQUIPMENT_ITEMS,
    EQUIPMENT_CODE_CATALOG_VERSION,
    getDemoUser,
    listDemoUsers
  };
})();
