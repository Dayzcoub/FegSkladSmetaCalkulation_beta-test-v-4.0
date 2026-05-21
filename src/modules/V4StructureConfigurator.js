// FEG Stage PRO v3.17.43 — V4StructureConfigurator
// Single v4 source of truth for stage/truss parts, BOM and quote sections.
// v4-only shared structure engine for quick calculators and quote wizard.
// v3.17.43 keeps stool real-dimension logic shared for quick and quote modes.
(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STRUCTURE_CONFIG_VERSION = '3.17.43';
  const STRUCTURE_PARTS_MIGRATION_KEY = 'fegV4StructurePartsCatalogVersion';
  const TRUSS_TOP_NODE_HEIGHT_M = 0.5;
  const TRUSS_3D_NODE_TYPES = Object.freeze(['cornerU012','cornerU020','cornerU022','cornerU024']);
  const TRUSS_T_NODE_TYPES = Object.freeze(['cornerU017']);
  const TRUSS_STRAIGHT_TYPE_ORDER = Object.freeze(['truss3','truss25','truss2','truss15','truss1','truss05']);
  const TRUSS_COMPATIBILITY_VERSION = '3.17.43';
  const TRUSS_DEFAULT_COMPATIBILITY_GROUP = 'T29Q-C2-BOX-290';
  const TRUSS_DEFAULT_INTERFACE = 'C2';
  const TRUSS_STOOL_DIMENSION_POLICY_VERSION = '3.17.43-shared-quick-quote-top-frame';
  const TRUSS_STRAIGHT_LENGTHS = Object.freeze({ truss3:3, truss25:2.5, truss2:2, truss15:1.5, truss1:1, truss05:0.5 });
  const STRUCTURE_PART_ALIASES = Object.freeze({
    truss3: Object.freeze({ ids:['eq-truss-3m'], codes:['TRS-001'], legacy:['TR-3.0','TR-3M','TRUSS-3M'] }),
    truss25: Object.freeze({ ids:['eq-truss-25m'], codes:['TRS-008'], legacy:['TR-2.5','TR-2.5M','TRUSS-2.5M'] }),
    truss2: Object.freeze({ ids:['eq-truss-2m'], codes:['TRS-002'], legacy:['TR-2.0','TR-2M','TRUSS-2M'] }),
    truss15: Object.freeze({ ids:['eq-truss-15m'], codes:['TRS-007'], legacy:['TR-1.5','TR-1.5M','TRUSS-1.5M'] }),
    truss1: Object.freeze({ ids:['eq-truss-1m'], codes:['TRS-006'], legacy:['TR-1.0','TR-1M','TRUSS-1M'] }),
    truss05: Object.freeze({ ids:['eq-truss-05m'], codes:['TRS-005'], legacy:['TR-0.5','TR-0.5M','TRUSS-0.5M'] }),
    cornerU003: Object.freeze({ ids:['eq-truss-corner-90'], codes:['TRS-009'], legacy:['TR-CORNER-90','U003'] }),
    cornerU022: Object.freeze({ ids:['eq-truss-cube'], codes:['TRS-010'], legacy:['TR-CUBE','U022'] }),
    base: Object.freeze({ ids:['eq-truss-base'], codes:['TRS-011'], legacy:['TR-BASE'] }),
    c288: Object.freeze({ ids:['eq-c288'], codes:['TRS-003'], legacy:['C2-88'] }),
    c383: Object.freeze({ ids:['eq-c383'], codes:['TRS-004'], legacy:['C3-83'] }),
    c267: Object.freeze({ ids:['eq-c267'], codes:['TRS-012'], legacy:['C2-67'] }),
    cotter: Object.freeze({ ids:['eq-splint'], codes:['TRS-013'], legacy:['C2-2-48','SPLINT'] })
  });

  const STAGE_DECK_VARIANTS = Object.freeze([
    Object.freeze({ key:'stage_deck_1200', label:'Настил 1.2×1.2 м', widthM:1.2, depthM:1.2, partKey:'stage_deck_1200' })
  ]);
  const STAGE_SUPPORT_VARIANTS = Object.freeze([
    Object.freeze({ key:'stage_support_low', label:'Столб низкий', partKey:'stage_support_low', defaultHeightM:0.4 }),
    Object.freeze({ key:'stage_support_middle', label:'Столб средний', partKey:'stage_support_middle', defaultHeightM:0.8 }),
    Object.freeze({ key:'stage_support_high', label:'Столб высокий', partKey:'stage_support_high', defaultHeightM:1.1 })
  ]);
  const STAGE_FRAME_VARIANTS = Object.freeze([
    Object.freeze({ key:'stage_frame_low', label:'Перекладина низкая', partKey:'stage_frame_low' }),
    Object.freeze({ key:'stage_frame_high', label:'Перекладина средняя', partKey:'stage_frame_high' })
  ]);
  const STAGE_EDGE_CLOSURE_VARIANTS = Object.freeze([
    Object.freeze({ key:'fabric_skirt', label:'Тканевая юбка', partKey:'stage_edge_skirt' }),
    Object.freeze({ key:'raus_banner', label:'Раус с баннером', partKey:'stage_edge_raus_banner' })
  ]);

  const STAGE_PARTS = Object.freeze([
    { key:'stage_deck_1200', id:'eq_sys_stage_deck_1200', code:'STG-901', name:'Модуль / лист настила сцены 1.2×1.2 м', category:'stage', subcategory:'настил', type:'stage_deck', unit:'шт', weightKg:18, meta:{ deckWidthM:1.2, deckDepthM:1.2, stageVariant:'deck_1200' }, notes:'Системная позиция v4: размер настила задаёт физический шаг сетки сцены.' },
    { key:'stage_support_middle', id:'eq_sys_stage_support', code:'STG-902', name:'Столб / опора сцены средняя', category:'stage', subcategory:'опоры', type:'stage_support', unit:'шт', weightKg:2.6, meta:{ stageSupportType:'middle', legacyWeightKey:'column_middle' }, notes:'Системная позиция v4: считается по вершинам выбранных модулей сцены.' },
    { key:'stage_frame_low', id:'eq_sys_stage_frame_crossbar', code:'STG-903', name:'Перекладина / рама сцены низкая', category:'stage', subcategory:'рамы', type:'stage_part', unit:'шт', weightKg:3.5, meta:{ stageFrameType:'low', legacyWeightKey:'frame_low' }, notes:'Системная позиция v4: считается по рёбрам модульной схемы сцены.' },
    { key:'stage_support_low', id:'eq_sys_stage_support_low', code:'STG-904', name:'Столб / опора сцены низкая', category:'stage', subcategory:'опоры', type:'stage_support', unit:'шт', weightKg:0.6, meta:{ stageSupportType:'low', legacyWeightKey:'column_low' }, notes:'Перенесено из v3: разновидность столба сцены.' },
    { key:'stage_support_high', id:'eq_sys_stage_support_high', code:'STG-905', name:'Столб / опора сцены высокая', category:'stage', subcategory:'опоры', type:'stage_support', unit:'шт', weightKg:4.8, meta:{ stageSupportType:'high', legacyWeightKey:'column_high' }, notes:'Перенесено из v3: разновидность столба сцены.' },
    { key:'stage_frame_high', id:'eq_sys_stage_frame_high', code:'STG-906', name:'Перекладина / рама сцены средняя', category:'stage', subcategory:'рамы', type:'stage_part', unit:'шт', weightKg:5, meta:{ stageFrameType:'middle', legacyWeightKey:'frame_high', legacyFrameKey:'stage_frame_high' }, notes:'Перенесено из v3: средняя перекладина сцены для средних и высоких столбов.' },
    { key:'stage_stud', id:'eq_sys_stage_stud', code:'STG-907', name:'Шпилька регулировочная опоры сцены', category:'stage', subcategory:'крепёж', type:'stage_part', unit:'шт', weightKg:1.5, meta:{ legacyWeightKey:'stud' }, notes:'Перенесено из v3: по одной шпильке на каждую опору/столб.' },
    { key:'stage_foot', id:'eq_sys_stage_foot', code:'STG-908', name:'Пятка опорная под столб сцены', category:'stage', subcategory:'опоры', type:'stage_part', unit:'шт', weightKg:0, meta:{ stagePart:'foot', weightNeedsRealValue:true }, notes:'Перенесено из v3: по одной пятке на каждую опору. Вес оставлен 0 до заполнения реального складского веса.' },
    { key:'stage_stair', id:'eq_sys_stage_stair', code:'STG-909', name:'Лестница сценическая', category:'stage', subcategory:'лестницы', type:'stage_accessory', unit:'шт', weightKg:0, meta:{ stagePart:'stair', weightNeedsRealValue:true }, notes:'Системная позиция v4: размещается отдельным блоком на плане сцены. Вес добивается в базе оборудования.' },
    { key:'stage_edge_skirt', id:'eq_sys_stage_edge_skirt', code:'STG-910', name:'Закрытие торцов сцены · тканевая юбка', category:'stage', subcategory:'закрытие торцов', type:'stage_accessory', unit:'м.п.', weightKg:0, meta:{ stagePart:'edge_closure', edgeClosureType:'fabric_skirt', weightNeedsRealValue:true }, notes:'Системная позиция v4: считается по открытому периметру выбранных настилов.' },
    { key:'stage_edge_raus_banner', id:'eq_sys_stage_edge_raus_banner', code:'STG-911', name:'Закрытие торцов сцены · раус с баннером', category:'stage', subcategory:'закрытие торцов', type:'stage_accessory', unit:'м.п.', weightKg:0, meta:{ stagePart:'edge_closure', edgeClosureType:'raus_banner', weightNeedsRealValue:true }, notes:'Системная позиция v4: считается по открытому периметру выбранных настилов.' }
  ]);

  const TRUSS_PARTS = Object.freeze([
    { key:'truss3', id:'eq_sys_truss_3m', code:'TRS-901', name:'MDM T29Q ферма прямая 3.0 м', manufacturer:'МДМ-Технология', model:'TQ29x29V300CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:17.9, rentalPrice:1500, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 3000 мм. Внутренние названия: ферма 3 м, прямая 3 м, палка 3 м, секция 3 м.', meta:{ trussSpecType:'truss3', trussLengthM:3, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 3 м','прямая 3 м','палка 3 м','секция 3 м','траверса 3 м'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'truss25', id:'eq_sys_truss_25m', code:'TRS-902', name:'MDM T29Q ферма прямая 2.5 м', manufacturer:'МДМ-Технология', model:'TQ29x29V250CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:15, rentalPrice:1250, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 2500 мм. Внутренние названия: ферма 2.5 м, прямая 2.5 м, палка 2.5 м, секция 2.5 м.', meta:{ trussSpecType:'truss25', trussLengthM:2.5, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 2.5 м','ферма 2,5 м','прямая 2.5 м','палка 2.5 м','секция 2.5 м'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'truss2', id:'eq_sys_truss_2m', code:'TRS-903', name:'MDM T29Q ферма прямая 2.0 м', manufacturer:'МДМ-Технология', model:'TQ29x29V200CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:12.4, rentalPrice:1000, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 2000 мм. Внутренние названия: ферма 2 м, прямая 2 м, палка 2 м, секция 2 м.', meta:{ trussSpecType:'truss2', trussLengthM:2, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 2 м','прямая 2 м','палка 2 м','секция 2 м','траверса 2 м'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'truss15', id:'eq_sys_truss_15m', code:'TRS-904', name:'MDM T29Q ферма прямая 1.5 м', manufacturer:'МДМ-Технология', model:'TQ29x29V150CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:10, rentalPrice:750, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 1500 мм. Внутренние названия: ферма 1.5 м, прямая 1.5 м, палка 1.5 м, секция 1.5 м.', meta:{ trussSpecType:'truss15', trussLengthM:1.5, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 1.5 м','ферма 1,5 м','прямая 1.5 м','палка 1.5 м','секция 1.5 м'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'truss1', id:'eq_sys_truss_1m', code:'TRS-905', name:'MDM T29Q ферма прямая 1.0 м', manufacturer:'МДМ-Технология', model:'TQ29x29V100CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:7, rentalPrice:500, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 1000 мм. Внутренние названия: ферма 1 м, прямая 1 м, палка 1 м, секция 1 м.', meta:{ trussSpecType:'truss1', trussLengthM:1, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 1 м','прямая 1 м','палка 1 м','секция 1 м','метровка'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'truss05', id:'eq_sys_truss_05m', code:'TRS-906', name:'MDM T29Q ферма прямая 0.5 м', manufacturer:'МДМ-Технология', model:'TQ29x29V50CXV', category:'truss', subcategory:'прямые фермы', type:'truss_segment', unit:'шт', weightKg:4.4, rentalPrice:250, replacementCost:0, notes:'МДМ-Технология T29 вид Q: квадратная ферма 290×290 мм, соединительная система C2, длина 500 мм. Внутренние названия: ферма 0.5 м, прямая 0.5 м, палка 0.5 м, секция 0.5 м, полметровка.', meta:{ trussSpecType:'truss05', trussLengthM:0.5, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', mdmSectionMm:'290x290', internalAliases:['ферма 0.5 м','ферма 0,5 м','прямая 0.5 м','палка 0.5 м','секция 0.5 м','полметровка'], catalogNote:'аренда 500 ₽/м.п.' } },
    { key:'cornerU003', id:'eq_sys_truss_u003', code:'TRS-911', name:'MDM T29Q U003 угол 90°', manufacturer:'МДМ-Технология', model:'U003 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:5.2, rentalPrice:500, replacementCost:0, notes:'Угловой блок MDM серии T29 вид Q, 90°, 2 направления, соединение C2. Внутренние названия: угол, уголок, элька, колено.', meta:{ trussSpecType:'cornerU003', legacyCode:'U003', legacyCodes:['U003','TR-CORNER-90'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['угол','угол 90','уголок','элька','колено','U003'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU017', id:'eq_sys_truss_u017', code:'TRS-912', name:'MDM T29Q U017 Т-узел 90°', manufacturer:'МДМ-Технология', model:'U017 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:8.1, rentalPrice:500, replacementCost:0, notes:'Т-образный угловой блок MDM серии T29 вид Q, 3 направления, соединение C2. Внутренние названия: тэшка, тройник, Т-узел.', meta:{ trussSpecType:'cornerU017', legacyCode:'U017', legacyCodes:['U017'], dimensionsMm:{ x:710, y:500, z:500 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['тэшка','тройник','Т-узел','Т-образный угол','U017'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU016', id:'eq_sys_truss_u016', code:'TRS-913', name:'MDM T29Q U016 крест 90°', manufacturer:'МДМ-Технология', model:'U016 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:10, rentalPrice:500, replacementCost:0, notes:'Крестовой угловой блок MDM серии T29 вид Q, 4 направления, соединение C2. Внутренние названия: крест, крестовина.', meta:{ trussSpecType:'cornerU016', legacyCode:'U016', legacyCodes:['U016'], dimensionsMm:{ x:710, y:710, z:290 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['крест','крестовина','крестовой узел','U016'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU001', id:'eq_sys_truss_u001', code:'TRS-914', name:'MDM T29Q U001 угол 45°', manufacturer:'МДМ-Технология', model:'U001 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:9.7, rentalPrice:500, replacementCost:0, notes:'Угловой блок MDM серии T29 вид Q, 45°, соединение C2. Внутренние названия: угол 45, колено 45.', meta:{ trussSpecType:'cornerU001', legacyCode:'U001', legacyCodes:['U001'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['угол 45','уголок 45','колено 45','U001'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU002', id:'eq_sys_truss_u002', code:'TRS-915', name:'MDM T29Q U002 угол 60°', manufacturer:'МДМ-Технология', model:'U002 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:9.87, rentalPrice:500, replacementCost:0, notes:'Угловой блок MDM серии T29 вид Q, 60°, соединение C2. Внутренние названия: угол 60, колено 60.', meta:{ trussSpecType:'cornerU002', legacyCode:'U002', legacyCodes:['U002'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['угол 60','уголок 60','колено 60','U002'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU004', id:'eq_sys_truss_u004', code:'TRS-916', name:'MDM T29Q U004 угол 120°', manufacturer:'МДМ-Технология', model:'U004 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:6.12, rentalPrice:500, replacementCost:0, notes:'Угловой блок MDM серии T29 вид Q, 120°, соединение C2. Внутренние названия: угол 120, колено 120.', meta:{ trussSpecType:'cornerU004', legacyCode:'U004', legacyCodes:['U004'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['угол 120','уголок 120','колено 120','U004'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU005', id:'eq_sys_truss_u005', code:'TRS-917', name:'MDM T29Q U005 угол 135°', manufacturer:'МДМ-Технология', model:'U005 T29Q C2', category:'truss', subcategory:'углы', type:'truss_node', unit:'шт', weightKg:6.5, rentalPrice:500, replacementCost:0, notes:'Угловой блок MDM серии T29 вид Q, 135°, соединение C2. Внутренние названия: угол 135, колено 135.', meta:{ trussSpecType:'cornerU005', legacyCode:'U005', legacyCodes:['U005'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['угол 135','уголок 135','колено 135','U005'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU012', id:'eq_sys_truss_u012', code:'TRS-918', name:'MDM T29Q U012 3D-угол 90°', manufacturer:'МДМ-Технология', model:'U012 T29Q C2', category:'truss', subcategory:'кубы', type:'truss_node', unit:'шт', weightKg:7.2, rentalPrice:500, replacementCost:0, notes:'Объёмный угловой блок MDM серии T29 вид Q, 3 направления, соединение C2. Внутренние названия: 3D угол, трёхлучевой узел.', meta:{ trussSpecType:'cornerU012', legacyCode:'U012', legacyCodes:['U012'], dimensionsMm:{ x:500, y:500, z:500 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['3D угол','трёхлучевой узел','трехлучевой узел','U012'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU020', id:'eq_sys_truss_u020', code:'TRS-919', name:'MDM T29Q U020 3D-узел 4 направления', manufacturer:'МДМ-Технология', model:'U020 T29Q C2', category:'truss', subcategory:'кубы', type:'truss_node', unit:'шт', weightKg:10, rentalPrice:500, replacementCost:0, notes:'Объёмный угловой блок MDM серии T29 вид Q, 4 направления, соединение C2. Внутренние названия: 3D крест, четырёхлучевой узел.', meta:{ trussSpecType:'cornerU020', legacyCode:'U020', legacyCodes:['U020'], dimensionsMm:{ x:710, y:500, z:500 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['3D крест','четырёхлучевой узел','четырехлучевой узел','U020'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU022', id:'eq_sys_truss_u022', code:'TRS-920', name:'MDM T29Q U022 куб 90° · 6 направлений', manufacturer:'МДМ-Технология', model:'U022 T29Q C2', category:'truss', subcategory:'кубы', type:'truss_node', unit:'шт', weightKg:13.8, rentalPrice:500, replacementCost:0, notes:'Кубовый узел MDM серии T29 вид Q, 6 направлений, соединение C2. Внутренние названия: куб, кубик, центральный узел.', meta:{ trussSpecType:'cornerU022', legacyCode:'U022', legacyCodes:['U022','TR-CUBE'], dimensionsMm:{ x:710, y:710, z:710 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['куб','кубик','центральный узел','U022'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'cornerU024', id:'eq_sys_truss_u024', code:'TRS-921', name:'MDM T29Q U024 3D-узел 5 направлений', manufacturer:'МДМ-Технология', model:'U024 T29Q C2', category:'truss', subcategory:'кубы', type:'truss_node', unit:'шт', weightKg:12.1, rentalPrice:500, replacementCost:0, notes:'Объёмный угловой блок MDM серии T29 вид Q, 5 направлений, соединение C2. Внутренние названия: пятилучевой узел, 3D узел 5 направлений.', meta:{ trussSpecType:'cornerU024', legacyCode:'U024', legacyCodes:['U024'], dimensionsMm:{ x:710, y:710, z:500 }, trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['пятилучевой узел','3D узел 5 направлений','U024'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'base', id:'eq_sys_truss_base', code:'TRS-930', name:'MDM T29Q база / блин 29 кг', manufacturer:'МДМ-Технология', model:'C2-290-Q / рабочая база 29 кг', category:'truss', subcategory:'базы/блины', type:'truss_base', unit:'шт', weightKg:29, rentalPrice:500, replacementCost:0, notes:'Опорная база под ферму T29Q. Рабочая масса базы в каталоге FEG: 29 кг. Внутренние названия: база, блин, плита, опорная площадка, пятка.', meta:{ trussSpecType:'base', legacyCode:'TR-BASE', legacyCodes:['TR-BASE','BASE','BLIN'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, mdmSeries:'T29 вид Q', internalAliases:['база','блин','плита','опорная площадка','пятка','base'], catalogNote:'аренда 500 ₽/блок' } },
    { key:'c288', id:'eq_sys_truss_c288', code:'TRS-940', name:'MDM C2-88 коннектор / бабышка', manufacturer:'МДМ-Технология', model:'C2-88', category:'truss', subcategory:'коннекторы', type:'truss_connector', unit:'шт', weightKg:0.16, rentalPrice:0, replacementCost:0, notes:'Конусный коннектор MDM C2-88 для соединения ферм T29/T39/T52. Внутренние названия: бабышка, конус, коннектор, вставка. Цена аренды 0 ₽ — включено в стоимость ферм/узлов.', meta:{ trussSpecType:'c288', legacyCode:'C2-88', legacyCodes:['C2-88'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, internalAliases:['бабышка','конус','коннектор','конусный коннектор','вставка','C2-88'], includedInRental:true, catalogNote:'без отдельной цены, включено в фермы/узлы' } },
    { key:'c383', id:'eq_sys_truss_c383', code:'TRS-941', name:'MDM C3-83 полуконнектор / полубабышка', manufacturer:'МДМ-Технология', model:'C3-83', category:'truss', subcategory:'коннекторы', type:'truss_connector', unit:'шт', weightKg:0.27, rentalPrice:0, replacementCost:0, notes:'Полуконнектор конусный MDM C3-83. Внутренние названия: полубабышка, полуконус, полуконнектор. Цена аренды 0 ₽ — включено в стоимость ферм/узлов.', meta:{ trussSpecType:'c383', legacyCode:'C3-83', legacyCodes:['C3-83'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, internalAliases:['полубабышка','полуконус','полуконнектор','C3-83'], includedInRental:true, catalogNote:'без отдельной цены, включено в фермы/узлы' } },
    { key:'c267', id:'eq_sys_truss_c267', code:'TRS-942', name:'MDM палец C2 / пин', manufacturer:'МДМ-Технология', model:'C2-16-72 / C2-67', category:'truss', subcategory:'крепёж', type:'truss_connector', unit:'шт', weightKg:0.1, rentalPrice:0, replacementCost:0, notes:'Стальной палец C2 с отверстием под шплинт. Внутренние названия: палец, пин, штырь. Цена аренды 0 ₽ — включено в стоимость ферм/узлов.', meta:{ trussSpecType:'c267', legacyCode:'C2-67', legacyCodes:['C2-67','C2-16-72','PIN'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, internalAliases:['палец','пин','штырь','палец C2','C2-67','C2-16-72'], includedInRental:true, catalogNote:'без отдельной цены, включено в фермы/узлы' } },
    { key:'cotter', id:'eq_sys_truss_cotter', code:'TRS-943', name:'MDM C2-2-48 шплинт игольчатый', manufacturer:'МДМ-Технология', model:'C2-2-48', category:'truss', subcategory:'крепёж', type:'truss_connector', unit:'шт', weightKg:0.003, rentalPrice:0, replacementCost:0, notes:'Игольчатый шплинт MDM C2-2-48. Внутренние названия: шплинт, иголка, чека, фиксатор. Цена аренды 0 ₽ — включено в стоимость ферм/узлов.', meta:{ trussSpecType:'cotter', legacyCode:'C2-2-48', legacyCodes:['C2-2-48','SPLINT'], trussFamily:'T29Q', trussCompatibilityGroup:TRUSS_DEFAULT_COMPATIBILITY_GROUP, trussInterface:TRUSS_DEFAULT_INTERFACE, internalAliases:['шплинт','иголка','чека','фиксатор','пружинка','C2-2-48'], includedInRental:true, catalogNote:'без отдельной цены, включено в фермы/узлы' } }
  ]);

  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function partDefs() { return STAGE_PARTS.concat(TRUSS_PARTS).map(clone); }
  function trussDefByKey(key) { return TRUSS_PARTS.find(def => def && def.key === key) || null; }
  function isStraightTrussPartKey(key) { return Object.prototype.hasOwnProperty.call(TRUSS_STRAIGHT_LENGTHS, String(key || '')); }
  function trussPartCompatibilityMeta(def) {
    const d = def || {};
    if (d.category !== 'truss') return {};
    const meta = d.meta || {};
    const partKey = meta.trussSpecType || d.key || '';
    const straight = isStraightTrussPartKey(partKey);
    return {
      trussFamily: meta.trussFamily || 'T29Q',
      trussCompatibilityGroup: meta.trussCompatibilityGroup || TRUSS_DEFAULT_COMPATIBILITY_GROUP,
      trussInterface: meta.trussInterface || TRUSS_DEFAULT_INTERFACE,
      trussSpecType: partKey,
      trussPartKey: partKey,
      trussCompatible: true,
      trussCompatibilityVersion: TRUSS_COMPATIBILITY_VERSION,
      trussLengthM: straight ? toNumber(meta.trussLengthM || TRUSS_STRAIGHT_LENGTHS[partKey], 0) : toNumber(meta.trussLengthM, 0) || undefined
    };
  }
  function isQuickCatalogMode(input, overrides) {
    const src = input || {};
    const ov = overrides || {};
    const explicit = toText(ov.catalogMode || ov.sourceMode || src.catalogMode || src.sourceMode).toLowerCase();
    if (explicit === 'quick' || explicit === 'quick_ideal' || explicit === 'ideal') return true;
    if (explicit === 'quote' || explicit === 'inventory' || explicit === 'warehouse' || explicit === 'real') return false;
    const source = toText(ov.source || src.source).toLowerCase();
    return /(^|[-_.:])quick($|[-_.:])|quick-/.test(source) || source.includes('quick_');
  }
  function getCatalogMode(input, overrides) { return isQuickCatalogMode(input, overrides) ? 'quick' : 'quote'; }
  function decoratePartForQuick(part, sectionKey) {
    const src = part || {};
    const key = src.key || (src.meta && src.meta.systemPartKey) || src.id || 'part';
    return Object.assign({}, src, {
      id: `quick_ideal_${key}`,
      itemId: `quick_ideal_${key}`,
      item_id: `quick_ideal_${key}`,
      inventoryItemId: '',
      inventory_item_id: '',
      code: src.code ? `Q-${src.code}` : `Q-${String(key).toUpperCase()}`,
      manufacturer: src.manufacturer || 'FEG',
      sourceType: 'quick_ideal',
      source_type: 'quick_ideal',
      sourceSystem: 'quick_ideal_catalog',
      source_system: 'quick_ideal_catalog',
      stockQty: null,
      stock_qty: null,
      reservedQty: null,
      reserved_qty: null,
      availableQty: null,
      available_qty: null,
      meta: Object.assign({}, trussPartCompatibilityMeta(src), clone(src.meta || {}) || {}, {
        systemPart:true,
        systemPartKey:key,
        quickIdealCatalog:true,
        catalogMode:'quick',
        sectionType: sectionKey || src.category || '',
        structureConfiguratorVersion:STRUCTURE_CONFIG_VERSION
      })
    });
  }
  function getQuickIdealItems(sectionKey) {
    if (ROOT.QuickIdealCatalog && ROOT.QuickIdealCatalog.getItemsForSection) {
      try {
        return ROOT.QuickIdealCatalog.getItemsForSection(sectionKey || 'structure', { structureParts:partDefs() });
      } catch (_) {}
    }
    const key = String(sectionKey || '').toLowerCase();
    return partDefs()
      .filter(def => key === 'stage' ? def.category === 'stage' : key === 'truss' ? def.category === 'truss' : true)
      .map(def => decoratePartForQuick(def, key));
  }
  function getCatalogItems(input, overrides, sectionKey) {
    const src = input || {};
    const ov = overrides || {};
    if (getCatalogMode(src, ov) === 'quick') return getQuickIdealItems(sectionKey);
    if (Array.isArray(ov.equipmentItems)) return ov.equipmentItems;
    if (Array.isArray(src.equipmentItems)) return src.equipmentItems;
    return getStoredEquipmentItems();
  }
  function getCatalogContext(input, overrides, sectionKey) {
    const catalogMode = getCatalogMode(input || {}, overrides || {});
    return {
      catalogMode,
      sectionKey: sectionKey || '',
      equipmentItems: getCatalogItems(input || {}, overrides || {}, sectionKey),
      sourceType: catalogMode === 'quick' ? 'quick_ideal' : 'own',
      source_type: catalogMode === 'quick' ? 'quick_ideal' : 'own',
      sourceSystem: catalogMode === 'quick' ? 'quick_ideal_catalog' : 'equipment_database_system_part',
      source_system: catalogMode === 'quick' ? 'quick_ideal_catalog' : 'equipment_database_system_part'
    };
  }
  function addCatalogMeta(row, ctx) {
    const out = Object.assign({}, row || {});
    const c = ctx || {};
    if (c.catalogMode) out.catalogMode = c.catalogMode;
    if (c.sourceType) { out.sourceType = c.sourceType; out.source_type = c.sourceType; }
    if (c.sourceSystem) { out.sourceSystem = c.sourceSystem; out.source_system = c.sourceSystem; }
    out.meta = Object.assign({}, clone(out.meta || {}) || {}, { catalogMode: c.catalogMode || '', quickIdealCatalog: c.catalogMode === 'quick' });
    return out;
  }
  function partToItem(part) {
    return Object.assign({
      sourceType:'own', manufacturer:'FEG', model:'', stockQty:0, reservedQty:0, availableQty:0,
      weightKg:0, powerW:0, rentalPrice:0, replacementCost:0, isActive:true,
      createdAt:nowIso(), updatedAt:nowIso()
    }, part, { meta:Object.assign({ systemPart:true, systemPartKey:part.key, structureConfiguratorVersion:STRUCTURE_CONFIG_VERSION }, trussPartCompatibilityMeta(part), part.meta || {}) });
  }
  function normalizeWithDb(item) { return ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.normalizeItem ? ROOT.EquipmentDatabase.normalizeItem(item) : item; }
  function getStoredEquipmentItems() { return ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.getStoredItemsOrDemo ? ROOT.EquipmentDatabase.getStoredItemsOrDemo() : []; }
  function normalizeAliasToken(value) { return toText(value).toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9]+/gi, '').trim(); }
  function legacyTokens(item) {
    const meta = item && item.meta || {};
    const codes = [];
    if (meta.legacyCode) codes.push(meta.legacyCode);
    if (Array.isArray(meta.legacyCodes)) meta.legacyCodes.forEach(code => codes.push(code));
    // trussSpecType is a compatibility attribute, not a primary binding alias.
    if (meta.systemPartKey) codes.push(meta.systemPartKey);
    return codes.map(normalizeAliasToken).filter(Boolean);
  }
  function aliasList(def, prop) {
    const aliases = STRUCTURE_PART_ALIASES[def && def.key] || {};
    return Array.isArray(aliases[prop]) ? aliases[prop] : [];
  }
  function catalogCandidateScore(def, item) {
    if (!def || !item) return 0;
    const meta = item.meta || {};
    let score = 0;
    if (meta.systemPartKey === def.key) score = Math.max(score, 1000);
    if (item.id === def.id) score = Math.max(score, 950);
    if (aliasList(def, 'ids').includes(item.id)) score = Math.max(score, 900);
    if (item.code === def.code) score = Math.max(score, 850);
    if (aliasList(def, 'codes').includes(item.code)) score = Math.max(score, 800);
    const tokens = new Set(legacyTokens(item));
    const defLegacy = [def.key, def.meta && def.meta.legacyCode].concat(def.meta && def.meta.legacyCodes || [], aliasList(def, 'legacy')).map(normalizeAliasToken).filter(Boolean);
    if (defLegacy.some(token => tokens.has(token))) score = Math.max(score, 760);
    // Do not treat trussSpecType alone as a duplicate system-part binding: it is also used by compatible alternative inventory positions.
    return score;
  }
  function findSystemPartCandidates(def, items) {
    const list = Array.isArray(items) ? items : getStoredEquipmentItems();
    return list
      .map((item, index) => ({ item, index, score: catalogCandidateScore(def, item) }))
      .filter(row => row.item && row.score > 0)
      .sort((a, b) => {
        const aStock = toNumber(a.item.stockQty, 0) + toNumber(a.item.reservedQty, 0) + toNumber(a.item.availableQty, 0);
        const bStock = toNumber(b.item.stockQty, 0) + toNumber(b.item.reservedQty, 0) + toNumber(b.item.availableQty, 0);
        const aHasStock = aStock > 0 ? 1 : 0;
        const bHasStock = bStock > 0 ? 1 : 0;
        if (aHasStock !== bHasStock) return bHasStock - aHasStock;
        if (a.score !== b.score) return b.score - a.score;
        return a.index - b.index;
      });
  }
  function mergeSystemPart(def, existing) {
    const base = existing || {};
    const merged = Object.assign({}, def, base, {
      category: def.category,
      subcategory: def.subcategory,
      type: def.type,
      code: def.code,
      name: def.name,
      manufacturer: def.category === 'truss' ? (def.manufacturer || 'МДМ-Технология') : (base.manufacturer || def.manufacturer || 'FEG'),
      model: def.category === 'truss' ? (def.model || base.model || '') : (base.model || def.model || ''),
      unit: base.unit || def.unit,
      stockQty: Math.max(0, toNumber(base.stockQty, 0)),
      reservedQty: Math.max(0, toNumber(base.reservedQty, 0)),
      weightKg: def.category === 'truss' ? toNumber(def.weightKg, toNumber(base.weightKg, 0)) : (toNumber(base.weightKg, 0) || toNumber(def.weightKg, 0)),
      powerW: def.category === 'truss' ? toNumber(def.powerW, 0) : (toNumber(base.powerW, 0) || toNumber(def.powerW, 0)),
      rentalPrice: def.category === 'truss' ? toNumber(def.rentalPrice, 0) : (toNumber(base.rentalPrice, 0) || toNumber(def.rentalPrice, 0)),
      replacementCost: def.category === 'truss' ? toNumber(def.replacementCost, toNumber(base.replacementCost, 0)) : (toNumber(base.replacementCost, 0) || toNumber(def.replacementCost, 0)),
      sourceType: base.sourceType || 'own',
      isActive: base.isActive !== false,
      notes: def.category === 'truss'
        ? [def.notes, base.notes && !String(base.notes).includes(def.notes || '') ? `legacy note: ${base.notes}` : '', 'systemPart: используется сметным ферменным конструктором для складской проверки и совместимых замен.'].filter(Boolean).join(' ')
        : [base.notes, def.notes, 'FEG systemPart: используется сметным конструктором ферм/сцены для складской проверки.'].filter(Boolean).join(' '),
      meta: Object.assign({}, def.meta || {}, trussPartCompatibilityMeta(def), base.meta || {}, {
        systemPart:true,
        systemPartKey:def.key,
        structureConfiguratorVersion:STRUCTURE_CONFIG_VERSION,
        migratedAliasFrom: base.id && base.id !== def.id ? base.id : (base.meta && base.meta.migratedAliasFrom || '')
      }),
      updatedAt: nowIso()
    });
    return normalizeWithDb(merged);
  }
  function findSystemPart(key, items) {
    const list = Array.isArray(items) ? items : getStoredEquipmentItems();
    const def = partDefs().find(row => row.key === key || row.id === key);
    if (!def) return list.find(item => item && item.meta && item.meta.systemPartKey === key) || list.find(item => item && item.id === key) || null;
    const candidates = findSystemPartCandidates(def, list);
    return candidates.length ? candidates[0].item : null;
  }
  function getSystemPartMap(items) {
    const list = Array.isArray(items) ? items : getStoredEquipmentItems();
    return partDefs().reduce((map, def) => {
      const stored = findSystemPart(def.key, list) || partToItem(def);
      map[def.key] = normalizeWithDb(stored);
      return map;
    }, {});
  }
  function inferTrussPartKey(item) {
    const src = item || {};
    const meta = src.meta || {};
    const explicit = toText(meta.systemPartKey || meta.trussPartKey || meta.trussSpecType);
    if (trussDefByKey(explicit)) return explicit;
    const byId = TRUSS_PARTS.find(def => def.id === src.id || aliasList(def, 'ids').includes(src.id));
    if (byId) return byId.key;
    const byCode = TRUSS_PARTS.find(def => def.code === src.code || aliasList(def, 'codes').includes(src.code));
    if (byCode) return byCode.key;
    const tokens = new Set(legacyTokens(src));
    const byLegacy = TRUSS_PARTS.find(def => [def.key, def.meta && def.meta.legacyCode].concat(def.meta && def.meta.legacyCodes || [], aliasList(def, 'legacy')).map(normalizeAliasToken).filter(Boolean).some(token => tokens.has(token)));
    if (byLegacy) return byLegacy.key;
    const length = toNumber(meta.trussLengthM == null ? meta.truss_length_m : meta.trussLengthM, 0);
    const byLength = Object.keys(TRUSS_STRAIGHT_LENGTHS).find(key => Math.abs(TRUSS_STRAIGHT_LENGTHS[key] - length) < 0.001);
    if (byLength) return byLength;
    const nameToken = normalizeAliasToken([src.name, src.model, src.code].filter(Boolean).join(' '));
    if (/05|0?5|0m5/.test(nameToken) && /ферм|truss|t29|q29/.test(nameToken)) return 'truss05';
    if (/25|2m5|2 5/.test(nameToken) && /ферм|truss|t29|q29/.test(nameToken)) return 'truss25';
    if (/3м|3m|3000|truss3|ферма3/.test(nameToken)) return 'truss3';
    if (/2м|2m|2000|truss2|ферма2/.test(nameToken)) return 'truss2';
    if (/15|1m5|1500|ферма15/.test(nameToken)) return 'truss15';
    if (/1м|1m|1000|truss1|ферма1/.test(nameToken)) return 'truss1';
    return '';
  }
  function enrichTrussCompatibilityItem(item) {
    if (!item || item.category !== 'truss') return item;
    const partKey = inferTrussPartKey(item);
    const def = trussDefByKey(partKey);
    if (!def) return item;
    const meta = Object.assign({}, trussPartCompatibilityMeta(def), item.meta || {}, {
      trussCompatibilityVersion: TRUSS_COMPATIBILITY_VERSION,
      trussCompatible: true,
      trussPartKey: partKey,
      trussSpecType: (item.meta && item.meta.trussSpecType) || partKey
    });
    if (isStraightTrussPartKey(partKey)) meta.trussLengthM = toNumber(meta.trussLengthM || TRUSS_STRAIGHT_LENGTHS[partKey], TRUSS_STRAIGHT_LENGTHS[partKey]);
    return normalizeWithDb(Object.assign({}, item, { meta, updatedAt: item.updatedAt || nowIso() }));
  }
  function ensureTrussCompatibilityMetadata(items) {
    return (Array.isArray(items) ? items : []).map(enrichTrussCompatibilityItem);
  }
  function pruneTrussCatalogItems(items) {
    const removed = [];
    const source = Array.isArray(items) ? items : [];
    const allowedKeys = new Set(TRUSS_PARTS.map(def => def && def.key).filter(Boolean));
    const next = source.filter(item => {
      if (!item || item.category !== 'truss') return true;
      const partKey = inferTrussPartKey(item);
      const keep = !!partKey && allowedKeys.has(partKey);
      if (!keep) removed.push(item.id || item.code || item.name || 'unknown-truss-item');
      return keep;
    });
    return { items:next, removed };
  }
  function itemAvailableQty(item) { return Math.max(0, toNumber(item && (item.availableQty == null ? item.stockQty : item.availableQty), 0)); }
  function itemReservedQty(item) { return Math.max(0, toNumber(item && item.reservedQty, 0)); }
  function itemStockQty(item) { return Math.max(0, toNumber(item && item.stockQty, 0)); }
  function itemCompatGroup(item) { return toText(item && item.meta && item.meta.trussCompatibilityGroup) || ''; }
  function itemTrussPartKey(item) { return inferTrussPartKey(item); }
  function trussCompatibleCandidates(partKey, items, options) {
    const def = trussDefByKey(partKey);
    if (!def) return [];
    const meta = trussPartCompatibilityMeta(def);
    const list = ensureTrussCompatibilityMetadata(Array.isArray(items) ? items : getStoredEquipmentItems());
    const requireStock = !(options && options.includeEmpty);
    return list
      .filter(item => item && item.category === 'truss' && item.isActive !== false)
      .filter(item => itemTrussPartKey(item) === partKey)
      .filter(item => !meta.trussCompatibilityGroup || itemCompatGroup(item) === meta.trussCompatibilityGroup)
      .filter(item => !requireStock || itemAvailableQty(item) > 0)
      .sort((a, b) => {
        const aPrimary = a.meta && a.meta.systemPartKey === partKey ? 1 : 0;
        const bPrimary = b.meta && b.meta.systemPartKey === partKey ? 1 : 0;
        if (aPrimary !== bPrimary) return bPrimary - aPrimary;
        const av = itemAvailableQty(a);
        const bv = itemAvailableQty(b);
        if (av !== bv) return bv - av;
        return String(a.code || a.id || '').localeCompare(String(b.code || b.id || ''), 'ru');
      });
  }
  function cloneStockPool(items) {
    const pool = new Map();
    ensureTrussCompatibilityMetadata(Array.isArray(items) ? items : []).forEach(item => {
      if (!item || item.category !== 'truss') return;
      pool.set(item.id, { item, available: itemAvailableQty(item), used: 0 });
    });
    return pool;
  }
  function poolCandidatesForPart(pool, partKey) {
    const def = trussDefByKey(partKey);
    if (!def) return [];
    const group = trussPartCompatibilityMeta(def).trussCompatibilityGroup;
    return Array.from(pool.values())
      .filter(entry => entry && entry.item && entry.available > 0)
      .filter(entry => itemTrussPartKey(entry.item) === partKey && itemCompatGroup(entry.item) === group)
      .sort((a, b) => {
        const ap = a.item.meta && a.item.meta.systemPartKey === partKey ? 1 : 0;
        const bp = b.item.meta && b.item.meta.systemPartKey === partKey ? 1 : 0;
        if (ap !== bp) return bp - ap;
        if (a.available !== b.available) return b.available - a.available;
        return String(a.item.code || '').localeCompare(String(b.item.code || ''), 'ru');
      });
  }
  function consumePool(pool, partKey, qty) {
    let need = Math.max(0, Math.round(toNumber(qty, 0)));
    const allocations = [];
    poolCandidatesForPart(pool, partKey).forEach(entry => {
      if (need <= 0) return;
      const take = Math.min(need, entry.available);
      if (take <= 0) return;
      entry.available -= take;
      entry.used += take;
      need -= take;
      allocations.push({ item: entry.item, qty: take, partKey });
    });
    return { allocations, remaining: need };
  }
  function ensureSystemParts(items) {
    const db = ROOT.EquipmentDatabase;
    const list = db && db.normalizeItems ? db.normalizeItems(items || getStoredEquipmentItems()) : (Array.isArray(items) ? items.slice() : []);
    const added = [];
    const updated = [];
    const removed = [];
    let next = list.slice();
    partDefs().forEach(def => {
      const candidates = findSystemPartCandidates(def, next);
      if (!candidates.length) {
        next.push(normalizeWithDb(partToItem(def)));
        added.push(def.key);
        return;
      }
      const keeper = candidates[0];
      const merged = mergeSystemPart(def, keeper.item);
      next = next.filter((item, index) => {
        const duplicate = candidates.slice(1).some(row => row.index === index || row.item === item || (row.item && item && row.item.id === item.id));
        if (duplicate) removed.push(item && item.id || def.key);
        return !duplicate;
      });
      const idx = next.findIndex(item => item === keeper.item || item && keeper.item && item.id === keeper.item.id);
      if (idx >= 0) next[idx] = merged;
      else next.push(merged);
      const changed = JSON.stringify(keeper.item || {}) !== JSON.stringify(merged || {});
      if (changed || candidates.length > 1) updated.push(def.key);
    });
    const beforeCompat = JSON.stringify(next);
    next = ensureTrussCompatibilityMetadata(next);
    const compatibilityUpdated = beforeCompat !== JSON.stringify(next);
    if (compatibilityUpdated) updated.push('trussCompatibilityGroups');
    const beforePruneCount = next.length;
    const pruned = pruneTrussCatalogItems(next);
    next = pruned.items;
    if (pruned.removed.length) removed.push(...pruned.removed);
    const prunedChanged = beforePruneCount !== next.length;
    if (prunedChanged) updated.push('trussCatalogPrunedToConstructorParts');
    return { changed: added.length > 0 || updated.length > 0 || removed.length > 0 || compatibilityUpdated || prunedChanged, added, updated, removed, items: next };
  }
  function ensureStoredSystemParts() {
    if (!ROOT.EquipmentDatabase || !ROOT.EquipmentDatabase.saveItems) return { changed:false, added:[], updated:[], items:[] };
    try {
      const result = ensureSystemParts(ROOT.EquipmentDatabase.getStoredItemsOrDemo());
      if (result.changed) {
        ROOT.EquipmentDatabase.saveItems(result.items);
        if (GLOBAL.localStorage) GLOBAL.localStorage.setItem(STRUCTURE_PARTS_MIGRATION_KEY, STRUCTURE_CONFIG_VERSION);
      }
      return result;
    } catch (err) { return { changed:false, added:[], updated:[], error: err && err.message || String(err) }; }
  }
  function makeBomRow(part, qty, note, extra) {
    const q = Math.max(0, toNumber(qty, 0));
    const ext = extra || {};
    const weight = q * toNumber(part && part.weightKg, 0);
    const unitRentalPrice = toNumber(ext && ext.rentalPrice != null ? ext.rentalPrice : (part && part.rentalPrice), 0);
    const resolvedSourceType = toText(ext.sourceType || ext.source_type || part && (part.sourceType || part.source_type) || 'own') || 'own';
    const resolvedSourceSystem = toText(ext.sourceSystem || ext.source_system || part && (part.sourceSystem || part.source_system)) || (resolvedSourceType === 'quick_ideal' ? 'quick_ideal_catalog' : 'equipment_database_system_part');
    return Object.assign({
      id: part && part.id,
      itemId: part && part.id,
      item_id: part && part.id,
      inventoryItemId: resolvedSourceType === 'quick_ideal' ? '' : (part && part.id),
      inventory_item_id: resolvedSourceType === 'quick_ideal' ? '' : (part && part.id),
      code: part && part.code,
      name: part && part.name,
      category: part && part.category,
      type: part && part.type,
      qty: q,
      quantity: q,
      requestedQty: q,
      requested_qty: q,
      unit: part && part.unit || 'шт',
      unitWeightKg: toNumber(part && part.weightKg, 0),
      unit_weight_kg: toNumber(part && part.weightKg, 0),
      weightKg: weight,
      rentalPrice: unitRentalPrice,
      rental_price: unitRentalPrice,
      totalRental: q * unitRentalPrice,
      total_rental: q * unitRentalPrice,
      powerW: q * toNumber(part && part.powerW, 0),
      power_w: q * toNumber(part && part.powerW, 0),
      note: note || '',
      sourceType: resolvedSourceType,
      source_type: resolvedSourceType,
      sourceSystem: resolvedSourceSystem,
      source_system: resolvedSourceSystem,
      sourceTypeSuggestion: resolvedSourceType === 'quick_ideal' ? 'quick_ideal' : 'own',
      source_type_suggestion: resolvedSourceType === 'quick_ideal' ? 'quick_ideal' : 'own',
      meta: Object.assign({}, part && part.meta || {}, { systemPart:true, systemPartKey: part && part.meta && part.meta.systemPartKey || '', structureBomVersion: STRUCTURE_CONFIG_VERSION, catalogMode: resolvedSourceType === 'quick_ideal' ? 'quick' : 'quote', quickIdealCatalog: resolvedSourceType === 'quick_ideal' })
    }, ext);
  }
  function createAllocatedBomRow(basePart, qty, note, extra) {
    const row = makeBomRow(basePart, qty, note, extra || {});
    const meta = basePart && basePart.meta || {};
    row.compatibilityGroup = meta.trussCompatibilityGroup || '';
    row.trussCompatibilityGroup = meta.trussCompatibilityGroup || '';
    row.trussFamily = meta.trussFamily || '';
    row.trussInterface = meta.trussInterface || '';
    row.stockQty = itemStockQty(basePart);
    row.stock_qty = row.stockQty;
    row.reservedQty = itemReservedQty(basePart);
    row.reserved_qty = row.reservedQty;
    row.availableQty = itemAvailableQty(basePart);
    row.available_qty = row.availableQty;
    return row;
  }
  function makeDeficitBomRow(part, qty, note, extra) {
    const row = makeBomRow(part, qty, note, Object.assign({}, extra || {}, { sourceType:'own', sourceTypeSuggestion:'subrent_needed' }));
    row.availableQty = 0;
    row.available_qty = 0;
    row.deficitQty = Math.max(0, Math.round(toNumber(qty, 0)));
    row.deficit_qty = row.deficitQty;
    row.subrentQty = row.deficitQty;
    row.subrent_qty = row.subrentQty;
    row.inventoryStatus = 'deficit';
    row.inventory_status = 'deficit';
    row.sourceTypeSuggestion = 'subrent_needed';
    row.source_type_suggestion = 'subrent_needed';
    row.note = [note, row.deficitQty ? `дефицит ${row.deficitQty} ${row.unit || 'шт'} — закрыть субарендой или ручной заменой` : ''].filter(Boolean).join(' · ');
    return row;
  }
  function allocationRowsFromDirect(partKey, requestedQty, part, note, extra, pool) {
    const qty = Math.max(0, Math.round(toNumber(requestedQty, 0)));
    const rows = [];
    let remaining = qty;
    const direct = consumePool(pool, partKey, qty);
    remaining = direct.remaining;
    direct.allocations.forEach(allocation => {
      const item = allocation.item || part;
      const compatibleReplacement = item && part && item.id !== part.id;
      rows.push(createAllocatedBomRow(item, allocation.qty, [note, compatibleReplacement ? `совместимая складская позиция вместо ${part.code || part.name || partKey}` : ''].filter(Boolean).join(' · '), Object.assign({}, extra || {}, { trussPart:partKey, compatibilitySourcePartId: part && part.id || '', compatibleReplacement })));
    });
    return { rows, remaining };
  }
  function findAlternativeLengthCombo(targetLength, pool) {
    const target = Math.round(toNumber(targetLength, 0) * 2);
    const availableCounts = TRUSS_STRAIGHT_TYPE_ORDER.reduce((map, key) => {
      const entries = poolCandidatesForPart(pool, key);
      map[key] = entries.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.available)), 0);
      return map;
    }, {});
    let best = null;
    function score(combo) {
      const pieces = combo.reduce((sum, key) => sum + (availableCounts[key] > 0 ? 1 : 10), 0);
      const longest = combo.reduce((max, key) => Math.max(max, TRUSS_STRAIGHT_LENGTHS[key] || 0), 0);
      const halfPenalty = combo.filter(key => key === 'truss05').length * 6;
      const rareLengthPenalty = combo.filter(key => key === 'truss25' || key === 'truss15').length * 1;
      return pieces * 100 + halfPenalty + rareLengthPenalty - longest;
    }
    function walk(startIndex, remain, combo, counts) {
      if (remain === 0) {
        const sorted = combo.slice().sort((a, b) => (TRUSS_STRAIGHT_LENGTHS[b] || 0) - (TRUSS_STRAIGHT_LENGTHS[a] || 0));
        if (!best || sorted.length < best.length || (sorted.length === best.length && score(sorted) < score(best))) best = sorted;
        return;
      }
      if (best && combo.length >= best.length) return;
      for (let i = startIndex; i < TRUSS_STRAIGHT_TYPE_ORDER.length; i += 1) {
        const key = TRUSS_STRAIGHT_TYPE_ORDER[i];
        const lenUnits = Math.round((TRUSS_STRAIGHT_LENGTHS[key] || 0) * 2);
        if (lenUnits <= 0 || lenUnits > remain) continue;
        if ((counts[key] || 0) >= (availableCounts[key] || 0)) continue;
        counts[key] = (counts[key] || 0) + 1;
        combo.push(key);
        walk(i, remain - lenUnits, combo, counts);
        combo.pop();
        counts[key] -= 1;
      }
    }
    walk(0, target, [], {});
    return best || [];
  }
  function buildTrussStraightRowsWithAlternatives(result, specs, parts, catalogContext) {
    const rows = [];
    const plan = { enabled: catalogContext.catalogMode === 'quote', extraConnections:0, replacements:[], unresolved:[] };
    const pool = cloneStockPool(catalogContext.equipmentItems || []);
    TRUSS_STRAIGHT_TYPE_ORDER.forEach(type => {
      const spec = specs[type] || {};
      const count = Math.max(0, Math.round(toNumber(result.counts && result.counts[type], 0)));
      const meters = toNumber(result.metersByType && result.metersByType[type], 0);
      if (!count && !meters) return;
      const part = parts[type];
      if (!part) return;
      const unitRentalPrice = meters > 0 && count > 0 ? (meters * 500) / count : 0;
      const baseExtra = { trussPart:type, meters, trussLengthM: toNumber(spec.length, 0), trussStraightCount: count, rentalPrice: unitRentalPrice };
      if (catalogContext.catalogMode !== 'quote') {
        rows.push(makeBomRow(part, count, `${meters.toFixed(1)} м суммарно`, baseExtra));
        return;
      }
      const direct = allocationRowsFromDirect(type, count, part, `${meters.toFixed(1)} м суммарно`, baseExtra, pool);
      rows.push(...direct.rows);
      let remaining = direct.remaining;
      for (let i = 0; i < remaining; i += 1) {
        const combo = findAlternativeLengthCombo(toNumber(spec.length, 0), pool);
        if (!combo.length || combo.length === 1 && combo[0] === type) {
          plan.unresolved.push({ requestedPart:type, requestedLengthM:toNumber(spec.length, 0), qty:1 });
          continue;
        }
        const replacement = { requestedPart:type, requestedLengthM:toNumber(spec.length, 0), combo:combo.slice(), extraConnections:Math.max(0, combo.length - 1) };
        plan.extraConnections += replacement.extraConnections;
        plan.replacements.push(replacement);
        combo.forEach(altType => {
          const altSpec = specs[altType] || {};
          const altPart = parts[altType];
          const consumed = consumePool(pool, altType, 1);
          const allocation = consumed.allocations[0];
          if (!allocation) return;
          const item = allocation.item || altPart;
          const altLen = toNumber(altSpec.length || TRUSS_STRAIGHT_LENGTHS[altType], 0);
          rows.push(createAllocatedBomRow(item, 1, `альтернативная сборка ${toNumber(spec.length, 0).toFixed(1)} м через ${combo.map(k => toNumber((specs[k] && specs[k].length) || TRUSS_STRAIGHT_LENGTHS[k], 0).toFixed(1)).join('+')} м`, { trussPart:altType, meters:altLen, trussLengthM:altLen, trussStraightCount:1, rentalPrice:altLen * 500, alternativeFor:type, alternative_length_for:type, alternativeLength:true, isAlternativeLength:true }));
        });
      }
      const unresolvedCount = plan.unresolved.filter(row => row.requestedPart === type).length;
      if (unresolvedCount > 0) rows.push(makeDeficitBomRow(part, unresolvedCount, `${toNumber(spec.length, 0).toFixed(1)} м: не хватило прямых и альтернативных длин`, Object.assign({}, baseExtra, { qty:unresolvedCount, trussStraightCount:unresolvedCount, meters:unresolvedCount * toNumber(spec.length, 0) })));
    });
    return { rows, plan };
  }
  function buildCompatiblePartRows(partKey, qty, part, note, extra, catalogContext) {
    const count = Math.max(0, Math.round(toNumber(qty, 0)));
    if (!count || !part) return [];
    if (catalogContext.catalogMode !== 'quote') return [makeBomRow(part, count, note, extra || {})];
    const pool = cloneStockPool(catalogContext.equipmentItems || []);
    const direct = allocationRowsFromDirect(partKey, count, part, note, Object.assign({}, extra || {}, { trussPart:partKey }), pool);
    const rows = direct.rows;
    if (direct.remaining > 0) rows.push(makeDeficitBomRow(part, direct.remaining, note, Object.assign({}, extra || {}, { trussPart:partKey })));
    return rows;
  }
  function compactTrussBomRows(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      if (!row) return;
      const key = [row.itemId || row.id || row.code || row.name, row.trussPart || row.truss_part || '', row.sourceType || row.source_type || '', row.alternativeFor || row.alternative_length_for || '', row.note || ''].join('::');
      const current = map.get(key);
      if (!current) {
        map.set(key, Object.assign({}, row));
        return;
      }
      const qty = toNumber(row.qty == null ? row.quantity : row.qty, 0);
      current.qty = toNumber(current.qty == null ? current.quantity : current.qty, 0) + qty;
      current.quantity = current.qty;
      current.requestedQty = toNumber(current.requestedQty, 0) + toNumber(row.requestedQty == null ? row.requested_qty : row.requestedQty, qty);
      current.requested_qty = current.requestedQty;
      current.weightKg = toNumber(current.weightKg == null ? current.weight_kg : current.weightKg, 0) + toNumber(row.weightKg == null ? row.weight_kg : row.weightKg, 0);
      current.weight_kg = current.weightKg;
      current.powerW = toNumber(current.powerW == null ? current.power_w : current.powerW, 0) + toNumber(row.powerW == null ? row.power_w : row.powerW, 0);
      current.power_w = current.powerW;
      current.totalRental = toNumber(current.totalRental == null ? current.total_rental : current.totalRental, 0) + toNumber(row.totalRental == null ? row.total_rental : row.totalRental, 0);
      current.total_rental = current.totalRental;
      current.meters = toNumber(current.meters, 0) + toNumber(row.meters, 0);
      current.trussStraightCount = toNumber(current.trussStraightCount == null ? current.truss_straight_count : current.trussStraightCount, 0) + toNumber(row.trussStraightCount == null ? row.truss_straight_count : row.trussStraightCount, qty);
      current.truss_straight_count = current.trussStraightCount;
      current.deficitQty = toNumber(current.deficitQty == null ? current.deficit_qty : current.deficitQty, 0) + toNumber(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0);
      current.deficit_qty = current.deficitQty;
      current.subrentQty = toNumber(current.subrentQty == null ? current.subrent_qty : current.subrentQty, 0) + toNumber(row.subrentQty == null ? row.subrent_qty : row.subrentQty, 0);
      current.subrent_qty = current.subrentQty;
    });
    return Array.from(map.values());
  }
  function findDefByKey(list, key, fallbackKey) {
    const arr = Array.isArray(list) ? list : [];
    return arr.find(item => item && item.key === key) || arr.find(item => item && item.key === fallbackKey) || arr[0] || null;
  }
  function getStageConstructiveCatalog() {
    return {
      version: STRUCTURE_CONFIG_VERSION,
      deckVariants: STAGE_DECK_VARIANTS.map(clone),
      supportVariants: STAGE_SUPPORT_VARIANTS.map(clone),
      frameVariants: STAGE_FRAME_VARIANTS.map(clone),
      frameDependencyRules: [
        { supportKey:'stage_support_low', frameKey:'stage_frame_low', defaultHeightM:0.4, label:'Низкий столб → низкая перекладина · высота по умолчанию 0,40 м' },
        { supportKey:'stage_support_middle', frameKey:'stage_frame_high', defaultHeightM:0.8, label:'Средний столб → средняя перекладина · высота по умолчанию 0,80 м' },
        { supportKey:'stage_support_high', frameKey:'stage_frame_high', defaultHeightM:1.1, label:'Высокий столб → средняя перекладина · высота по умолчанию 1,10 м' }
      ],
      stageHeightDefaults: {
        stage_support_low:0.4,
        stage_support_middle:0.8,
        stage_support_high:1.1
      },
      edgeClosureVariants: STAGE_EDGE_CLOSURE_VARIANTS.map(clone),
      accessories: [
        { key:'stage_stair', label:'Лестница сценическая', qtyRule:'ручное размещение блоком на плане' }
      ],
      hardware: [
        { key:'stage_stud', label:'Шпилька регулировочная', qtyRule:'1 шт на опору' },
        { key:'stage_foot', label:'Пятка опорная', qtyRule:'1 шт на опору' }
      ]
    };
  }
  function getStageDefaultHeightForSupport(supportKey) {
    const support = findDefByKey(STAGE_SUPPORT_VARIANTS, supportKey, 'stage_support_middle');
    return Math.max(0, Math.round(toNumber(support && support.defaultHeightM, 0.8) * 100) / 100);
  }

  function hasStageHeightValue(input) {
    const src = input || {};
    const value = src.stageHeightM != null ? src.stageHeightM : (src.heightM != null ? src.heightM : (src.stageHeight != null ? src.stageHeight : src.height));
    return value != null && String(value).trim() !== '';
  }

  function normalizeStageHeight(input) {
    const src = input || {};
    const value = src.stageHeightM != null ? src.stageHeightM : (src.heightM != null ? src.heightM : (src.stageHeight != null ? src.stageHeight : src.height));
    const fallback = getStageDefaultHeightForSupport(src.supportKey || src.stageSupportKey || src.columnType && `stage_support_${src.columnType}` || 'stage_support_middle');
    const n = hasStageHeightValue(src) ? toNumber(value, fallback) : fallback;
    return Math.max(0, Math.round(n * 100) / 100);
  }
  function formatStageHeight(value) { return `${normalizeStageHeight({ stageHeightM:value }).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м`; }

  function getStageFrameKeyForSupport(supportKey) {
    return String(supportKey || '') === 'stage_support_low' ? 'stage_frame_low' : 'stage_frame_high';
  }

  function normalizeStageFrameKey(value) {
    const raw = String(value || '');
    if (raw === 'stage_frame_middle' || raw === 'stage_frame_medium') return 'stage_frame_high';
    if (raw === 'middle' || raw === 'medium') return 'stage_frame_high';
    return raw;
  }

  function normalizeStageConfig(input) {
    const src = input || {};
    const deck = findDefByKey(STAGE_DECK_VARIANTS, src.deckKey || src.deckType || src.stageDeckKey, 'stage_deck_1200');
    const support = findDefByKey(STAGE_SUPPORT_VARIANTS, src.supportKey || src.columnType && `stage_support_${src.columnType}` || src.stageSupportKey, 'stage_support_middle');
    const requestedFrameKey = normalizeStageFrameKey(src.frameKey || src.frameType && `stage_frame_${src.frameType}` || src.stageFrameKey || '');
    const requiredFrameKey = getStageFrameKeyForSupport(support && support.key);
    const frame = findDefByKey(STAGE_FRAME_VARIANTS, requiredFrameKey, requiredFrameKey);
    const requestedFrame = findDefByKey(STAGE_FRAME_VARIANTS, requestedFrameKey, requiredFrameKey);
    const frameAutoAdjusted = !!requestedFrameKey && requestedFrameKey !== requiredFrameKey;
    const dependencyRule = support && support.key === 'stage_support_low'
      ? 'Низкий столб совместим только с низкой перекладиной.'
      : 'Средний и высокий столб используют среднюю перекладину.';
    return {
      deckKey: deck && deck.key || 'stage_deck_1200',
      deckPartKey: deck && deck.partKey || 'stage_deck_1200',
      deckLabel: deck && deck.label || 'Настил 1.2×1.2 м',
      moduleWidthM: toNumber(deck && deck.widthM, 1.2),
      moduleDepthM: toNumber(deck && deck.depthM, 1.2),
      supportKey: support && support.key || 'stage_support_middle',
      supportPartKey: support && support.partKey || 'stage_support_middle',
      supportLabel: support && support.label || 'Столб средний',
      frameKey: frame && frame.key || requiredFrameKey,
      framePartKey: frame && frame.partKey || requiredFrameKey,
      frameLabel: frame && frame.label || 'Перекладина средняя',
      frameDependency:{
        enabled:true,
        supportKey: support && support.key || 'stage_support_middle',
        requestedFrameKey: requestedFrame && requestedFrame.key || requestedFrameKey || '',
        requiredFrameKey,
        autoAdjusted:frameAutoAdjusted,
        rule:dependencyRule
      },
      studsEnabled: src.studsEnabled !== false,
      feetEnabled: src.feetEnabled !== false,
      edgeClosureEnabled: src.edgeClosureEnabled === true || src.closeEdges === true || src.edgeClosure === true,
      edgeClosureType: findDefByKey(STAGE_EDGE_CLOSURE_VARIANTS, src.edgeClosureType || src.edgeClosureKey || src.edgeType, 'fabric_skirt').key,
      edgeClosurePartKey: findDefByKey(STAGE_EDGE_CLOSURE_VARIANTS, src.edgeClosureType || src.edgeClosureKey || src.edgeType, 'fabric_skirt').partKey,
      edgeClosureLabel: findDefByKey(STAGE_EDGE_CLOSURE_VARIANTS, src.edgeClosureType || src.edgeClosureKey || src.edgeType, 'fabric_skirt').label
    };
  }

  function normalizeStageStairs(input) {
    const src = input || {};
    const raw = Array.isArray(src.stairs) ? src.stairs : (src.accessories && Array.isArray(src.accessories.stairs) ? src.accessories.stairs : (Array.isArray(src.stairBlocks) ? src.stairBlocks : []));
    const byKey = new Map();
    raw.forEach((item, index) => {
      const x = Math.round(toNumber(item && item.x, NaN));
      const y = Math.round(toNumber(item && item.y, NaN));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const key = `${x},${y}`;
      byKey.set(key, { id: item && item.id || `stage_stair_${index + 1}`, x, y, key, orientation: item && item.orientation || 'front' });
    });
    return Array.from(byKey.values()).sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function calculateStagePerimeter(modules, cfg) {
    const list = Array.isArray(modules) ? modules : [];
    const keys = new Set(list.map(p => `${Math.round(toNumber(p.x, 0))},${Math.round(toNumber(p.y, 0))}`));
    const widthM = toNumber(cfg && cfg.moduleWidthM, 1.2);
    const depthM = toNumber(cfg && cfg.moduleDepthM, 1.2);
    let horizontalEdges = 0;
    let verticalEdges = 0;
    list.forEach(point => {
      const x = Math.round(toNumber(point.x, 0));
      const y = Math.round(toNumber(point.y, 0));
      if (!keys.has(`${x},${y - 1}`)) horizontalEdges += 1;
      if (!keys.has(`${x},${y + 1}`)) horizontalEdges += 1;
      if (!keys.has(`${x - 1},${y}`)) verticalEdges += 1;
      if (!keys.has(`${x + 1},${y}`)) verticalEdges += 1;
    });
    const meters = horizontalEdges * widthM + verticalEdges * depthM;
    return { horizontalEdges, verticalEdges, meters: Math.round(meters * 100) / 100 };
  }

  function buildStageBomFromModules(modules, options) {
    const calc = ROOT.StageCalculator;
    const list = Array.isArray(modules) ? modules : [];
    const cfg = normalizeStageConfig(options || {});
    const stageHeightM = normalizeStageHeight(options || {});
    const stairs = normalizeStageStairs(options || {});
    const perimeter = calculateStagePerimeter(list, cfg);
    cfg.stageHeightM = stageHeightM;
    const snapshot = calc && calc.calculateStageQuoteSnapshot ? calc.calculateStageQuoteSnapshot({ modules:list, moduleWidthM:cfg.moduleWidthM, moduleDepthM:cfg.moduleDepthM, stageHeightM }) : { geometry:{ sheets:list.length, columns:0, frames:0 }, widthMeters:0, depthMeters:0, areaMeters:0, bounds:{ width:0, depth:0 } };
    snapshot.stageHeightM = stageHeightM;
    snapshot.stageHeightLabel = formatStageHeight(stageHeightM);
    snapshot.stageConfig = clone(cfg);
    snapshot.stageAccessories = { stairs: clone(stairs), stairsCount: stairs.length, edgeClosureEnabled: !!cfg.edgeClosureEnabled, edgeClosureType: cfg.edgeClosureType, edgeClosureLabel: cfg.edgeClosureLabel, edgeClosureMeters: cfg.edgeClosureEnabled ? perimeter.meters : 0, perimeterMeters: perimeter.meters };
    const geometry = snapshot.geometry || {};
    geometry.studs = cfg.studsEnabled ? toNumber(geometry.columns, 0) : 0;
    geometry.feet = cfg.feetEnabled ? toNumber(geometry.columns, 0) : 0;
    geometry.stairs = stairs.length;
    geometry.edgeClosureMeters = cfg.edgeClosureEnabled ? perimeter.meters : 0;
    geometry.perimeterMeters = perimeter.meters;
    const catalogContext = getCatalogContext(options || {}, options || {}, 'stage');
    const parts = getSystemPartMap(catalogContext.equipmentItems);
    const heightNote = `высота сцены ${formatStageHeight(stageHeightM)}`;
    const rows = [
      makeBomRow(parts[cfg.deckPartKey] || parts.stage_deck_1200, geometry.sheets, `${toNumber(snapshot.areaMeters, 0).toFixed(2)} м² настила · ${cfg.deckLabel} · ${heightNote}`, { stagePart:'deck', deckKey:cfg.deckKey, moduleWidthM:cfg.moduleWidthM, moduleDepthM:cfg.moduleDepthM, stageHeightM }),
      makeBomRow(parts[cfg.supportPartKey] || parts.stage_support_middle, geometry.columns, `${cfg.supportLabel} · по вершинам выбранных модулей · ${heightNote}`, { stagePart:'support', supportKey:cfg.supportKey, stageHeightM }),
      makeBomRow(parts[cfg.framePartKey] || parts.stage_frame_low, geometry.frames, `${cfg.frameLabel} · по внешним и внутренним рёбрам · ${heightNote}`, { stagePart:'frame', frameKey:cfg.frameKey, supportKey:cfg.supportKey, frameDependency:clone(cfg.frameDependency || {}), stageHeightM }),
      cfg.studsEnabled ? makeBomRow(parts.stage_stud, geometry.studs, `по одной шпильке на каждую опору · ${heightNote}`, { stagePart:'stud', stageHeightM }) : null,
      cfg.feetEnabled ? makeBomRow(parts.stage_foot, geometry.feet, `по одной пятке на каждую опору · ${heightNote}`, { stagePart:'foot', stageHeightM }) : null,
      stairs.length ? makeBomRow(parts.stage_stair, stairs.length, `размещены на плане: ${stairs.map(item => `${item.x + 1}:${item.y + 1}`).join(', ')} · ${heightNote}`, { stagePart:'stair', stageHeightM, stairs: clone(stairs) }) : null,
      cfg.edgeClosureEnabled && perimeter.meters > 0 ? makeBomRow(parts[cfg.edgeClosurePartKey] || parts.stage_edge_skirt, perimeter.meters, `${cfg.edgeClosureLabel} · открытый периметр ${perimeter.meters.toFixed(2)} м.п. · ${heightNote}`, { stagePart:'edge_closure', stageHeightM, edgeClosureType:cfg.edgeClosureType, edgeClosureLabel:cfg.edgeClosureLabel, edgeClosureMeters:perimeter.meters, meters:perimeter.meters }) : null
    ].filter(row => row && row.qty > 0).map(row => addCatalogMeta(row, catalogContext));
    return { snapshot, config:cfg, rows, weightKg: rows.reduce((sum, row) => sum + toNumber(row.weightKg, 0), 0), catalogMode: catalogContext.catalogMode };
  }
  function summarizeStageRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += toNumber(row && (row.qty == null ? row.quantity : row.qty), 0);
      acc.weightKg += toNumber(row && (row.weightKg == null ? row.weight_kg : row.weightKg), 0);
      acc.powerW += toNumber(row && (row.powerW == null ? row.power_w : row.powerW), 0);
      return acc;
    }, { rows:0, qty:0, weightKg:0, powerW:0 });
  }

  function makeStageQuote(section, overrides) {
    const quoteId = (overrides && overrides.quoteId) || 'v4_stage_shared_bom_snapshot';
    return {
      id: quoteId,
      type: 'feg-stage-pro-v4-stage-quote-snapshot',
      project: { name: (overrides && overrides.projectName) || 'Сцена v4' },
      scope: { stage:true, truss:false, led:false, sound:false, light:false, backline:false, services:false, transport:false },
      sections: { stage: section || null }
    };
  }

  function buildStageSharedBomSnapshot(input, overrides) {
    const section = buildStageSection(input || {}, Object.assign({ source:'v4-stage-shared-bom-snapshot' }, overrides || {}));
    const quote = makeStageQuote(section, overrides || {});
    const bridgeSvc = ROOT.V4SharedBomBridge;
    const pickSvc = ROOT.WarehousePickListBuilder;
    const bridge = bridgeSvc && bridgeSvc.buildQuoteBomBridge
      ? bridgeSvc.buildQuoteBomBridge(quote, { sectionKey:'stage', enrichAvailability:false })
      : { rows: section.bomRows || [], totals: summarizeStageRows(section.bomRows || []) };
    const quoteItems = bridgeSvc && bridgeSvc.buildQuoteItemRows
      ? bridgeSvc.buildQuoteItemRows(quote, { sectionKey:'stage', enrichAvailability:false })
      : (section.bomRows || []);
    const pickLists = pickSvc && pickSvc.buildPickLists ? pickSvc.buildPickLists(quote) : { all:{ rows:section.bomRows || [], totalWeightKg:section.weightKg || 0 }, sections:[] };
    return {
      type:'feg-stage-pro-v4-stage-shared-bom-snapshot',
      version:STRUCTURE_CONFIG_VERSION,
      quote,
      section,
      bridge,
      quoteItems,
      pickLists,
      totals:bridge && bridge.totals || summarizeStageRows(section.bomRows || []),
      generatedAt:nowIso(),
      protectedFlows:['legacy/v3','old v3 fallback','stock movements','reservations','controlled backend writes']
    };
  }

  function buildStageSection(input, overrides) {
    const src = input || {};
    const calc = ROOT.StageCalculator;
    let modules = Array.isArray(src.modules) ? src.modules : [];
    const explicitEmpty = src.explicitEmpty === true || src.startEmpty === true || src.cleanStart === true || Array.isArray(src.modules);
    if (!modules.length && !explicitEmpty && calc && calc.rectangleModules) {
      const rect = calc.rectangleModules(Math.max(1, toNumber(src.widthModules, 4)), Math.max(1, toNumber(src.depthModules, 3)), 12, 10);
      modules = rect.ok ? rect.modules : [];
    }
    const catalogContext = getCatalogContext(src, overrides || {}, 'stage');
    const bom = buildStageBomFromModules(modules, Object.assign({}, src, { catalogMode:catalogContext.catalogMode, equipmentItems:catalogContext.equipmentItems, sourceMode:catalogContext.catalogMode }));
    const snap = bom.snapshot || {};
    const res = snap;
    const cfg = bom.config || normalizeStageConfig(src);
    const accessories = snap.stageAccessories || {};
    const stairs = Array.isArray(accessories.stairs) ? accessories.stairs : normalizeStageStairs(src);
    const geometry = snap.geometry || {};
    return Object.assign({
      type:'stage',
      sectionKey:'stage',
      section_key:'stage',
      binderVersion:'v4-structure-' + STRUCTURE_CONFIG_VERSION,
      status:'configured',
      source:'V4StructureConfigurator',
      catalogMode:catalogContext.catalogMode,
      sourceMode:catalogContext.catalogMode,
      title:'Сцена',
      sharedBomReady:true,
      quoteItemsReady:true,
      warehousePickListReady:true,
      summary:`Сцена ${toNumber(snap.widthMeters, 0).toFixed(1)}×${toNumber(snap.depthMeters, 0).toFixed(1)} м · высота ${formatStageHeight(snap.stageHeightM)} · ${geometry.sheets || 0} листов · ${geometry.columns || 0} опор · ${geometry.frames || 0} перекладин · ${geometry.studs || 0} шпилек · ${geometry.feet || 0} пяток · лестницы ${geometry.stairs || 0} · торцы ${geometry.edgeClosureMeters || 0} м.п.`,
      stageHeightM:normalizeStageHeight({ stageHeightM:snap.stageHeightM }),
      heightM:normalizeStageHeight({ stageHeightM:snap.stageHeightM }),
      input:{ modules:clone(modules), explicitEmpty:modules.length === 0, widthModules:src.widthModules, depthModules:src.depthModules, deckKey:cfg.deckKey, supportKey:cfg.supportKey, frameKey:cfg.frameKey, frameDependency:clone(cfg.frameDependency || {}), moduleWidthM:cfg.moduleWidthM, moduleDepthM:cfg.moduleDepthM, stageHeightM:normalizeStageHeight({ stageHeightM:snap.stageHeightM }), studsEnabled:cfg.studsEnabled, feetEnabled:cfg.feetEnabled, stairs:clone(stairs), edgeClosureEnabled:cfg.edgeClosureEnabled, edgeClosureType:cfg.edgeClosureType },
      result:snap,
      stageConfig:cfg,
      bomRows:bom.rows,
      sharedBomTotals:summarizeStageRows(bom.rows),
      bomBridge:{ enabled:true, sectionKey:'stage', bridgeVersion:ROOT.V4SharedBomBridge && ROOT.V4SharedBomBridge.SHARED_BOM_BRIDGE_VERSION || '', note:'Stage section is ready for shared BOM, quote_items and warehouse pick lists.' },
      rental:toNumber(overrides && Object.prototype.hasOwnProperty.call(overrides, 'rental') ? overrides.rental : res.rental, res.rental),
      weightKg:bom.weightKg,
      powerW:0,
      updatedAt:nowIso()
    }, overrides || {});
  }
  function normalizeSubrentAssignments(source) {
    const map = new Map();
    const list = Array.isArray(source) ? source : (source && typeof source === 'object' ? Object.keys(source).map(key => Object.assign({ key }, source[key] || {})) : []);
    list.forEach(raw => {
      const row = raw || {};
      const key = toText(row.key || row.itemId || row.item_id || row.code || row.trussPart);
      if (!key) return;
      const qty = Math.max(0, Math.round(toNumber(row.qty == null ? row.subrentQty : row.qty, 0)));
      map.set(key, {
        qty,
        supplierId: toText(row.supplierId || row.supplier_id),
        supplierName: toText(row.supplierName || row.supplier_name),
        subrentPrice: toNumber(row.subrentPrice == null ? row.subrent_price : row.subrentPrice, 0),
        clientPrice: toNumber(row.clientPrice == null ? row.client_price : row.clientPrice, 0),
        note: toText(row.note)
      });
    });
    return map;
  }
  function applyTrussLinkedSubrent(rows, assignments) {
    const map = normalizeSubrentAssignments(assignments);
    if (!map.size) return rows;
    return (Array.isArray(rows) ? rows : []).map(row => {
      const keys = [row.itemId, row.id, row.code, row.trussPart, row.truss_part].map(toText).filter(Boolean);
      const foundKey = keys.find(key => map.has(key));
      if (!foundKey) return row;
      const link = map.get(foundKey) || {};
      if (!link.qty) return row;
      const next = Object.assign({}, row, {
        subrentQty: link.qty,
        subrent_qty: link.qty,
        supplierId: link.supplierId,
        supplier_id: link.supplierId,
        supplierName: link.supplierName,
        supplier_name: link.supplierName,
        subrentPrice: link.subrentPrice,
        subrent_price: link.subrentPrice,
        clientPrice: link.clientPrice || link.subrentPrice,
        client_price: link.clientPrice || link.subrentPrice,
        margin: Math.max(0, (link.clientPrice || link.subrentPrice) - link.subrentPrice) * link.qty,
        sourceTypeSuggestion: 'subrent_needed',
        source_type_suggestion: 'subrent_needed',
        note: [row.note, `Добрать в субаренду ${link.qty} ${row.unit || 'шт'}${link.supplierName ? ' · ' + link.supplierName : ''}${link.note ? ' · ' + link.note : ''}`].filter(Boolean).join(' · ')
      });
      return next;
    });
  }
  function isTruss3DNodeType(type) { return TRUSS_3D_NODE_TYPES.includes(String(type || '')); }
  function isTrussTNodeType(type) { return TRUSS_T_NODE_TYPES.includes(String(type || '')); }
  function orderedTrussSpecIds(specs) {
    const source = specs && typeof specs === 'object' ? specs : {};
    const used = new Set();
    const ids = [];
    TRUSS_STRAIGHT_TYPE_ORDER.forEach(id => { if (source[id]) { ids.push(id); used.add(id); } });
    Object.keys(source).forEach(id => { if (!used.has(id)) ids.push(id); });
    return ids;
  }

  function deriveTrussSectionGeometry(items, state, specs) {
    const st = state || {};
    const list = Array.isArray(items) ? items : [];
    const cellM = Math.max(0.5, toNumber(st.cellMeters, 0.5) || 0.5);
    const trussSpecs = specs || (ROOT.TrussBlockConstructor && ROOT.TrussBlockConstructor.getDefaultSpecs ? ROOT.TrussBlockConstructor.getDefaultSpecs() : {});
    const stored = clone(st.trussGeometry || st.geometry || {});
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let usesU012 = false, uses3dNodes = false, usesTJoints = false;
    list.forEach(item => {
      if (!item) return;
      const type = String(item.type || '');
      if (type === 'cornerU012') usesU012 = true;
      if (isTruss3DNodeType(type)) uses3dNodes = true;
      if (isTrussTNodeType(type)) usesTJoints = true;
      const spec = trussSpecs[type] || {};
      const x = toNumber(item.x, 0);
      const y = toNumber(item.y, 0);
      const lenCells = spec.kind === 'straight' ? Math.max(1, Math.round(toNumber(spec.length, 0) / cellM)) : 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + (item.o === 'h' ? lenCells : 1));
      maxY = Math.max(maxY, y + (item.o === 'v' ? lenCells : 1));
    });
    const footprintWidthM = Number.isFinite(maxX - minX) ? Math.max(0, Math.round((maxX - minX) * cellM * 100) / 100) : 0;
    const footprintDepthM = Number.isFinite(maxY - minY) ? Math.max(0, Math.round((maxY - minY) * cellM * 100) / 100) : 0;
    const is3d = !!(stored.is3d || stored.mode === '3d' || st.truss3d || usesU012 || uses3dNodes);
    return Object.assign({}, stored, {
      mode:is3d ? '3d' : (stored.mode || st.structureMode || '2d'),
      is3d,
      usesU012,
      uses3dNodes,
      usesTJoints,
      topNodeHeightM:TRUSS_TOP_NODE_HEIGHT_M,
      widthM:toNumber(stored.widthM || stored.width || footprintWidthM, 0),
      depthM:toNumber(stored.depthM || stored.depth || (is3d ? footprintDepthM : 0), 0),
      heightM:toNumber(stored.heightM || stored.height || (is3d ? footprintDepthM || 0 : 0), 0),
      footprintWidthM,
      footprintDepthM
    });
  }

  function buildTrussBomFromItems(items, state, options) {
    const truss = ROOT.TrussBlockConstructor;
    const specs = truss && truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const st = Object.assign({ cellMeters:0.5, trussSeries:'T29Q', pointScheme:'p1', cantileverView:'Q' }, state || {});
    const list = truss && truss.normalizeItems ? truss.normalizeItems(items || [], specs) : (Array.isArray(items) ? items : []);
    const connectionCount = truss && truss.autoConnectionCount ? Math.max(0, Math.round(truss.autoConnectionCount(list, specs, { cellMeters:st.cellMeters || 0.5 }))) : 0;
    st.connectionCount = connectionCount;
    const result = truss && truss.summarizeBom ? truss.summarizeBom(list, specs, st, { connectionCount }) : { counts:{}, metersByType:{}, weight:0 };
    const dimensionItems = truss && truss.topFrameItemsForDimensions ? truss.topFrameItemsForDimensions(list, st) : list;
    const spanInfo = truss && truss.effectiveSpanInfo ? truss.effectiveSpanInfo(dimensionItems, specs, st, { cellMeters:st.cellMeters || 0.5 }) : { maxEffective:toNumber(result.totalMeters, 0), runs:[] };
    result.loadDimensionSource = dimensionItems.length !== list.length ? 'stool-top-frame' : 'all-items';
    result.dimensionSource = result.loadDimensionSource;
    result.dimensionItemCount = dimensionItems.length;
    result.totalItemCount = list.length;
    result.stoolDimensionPolicy = TRUSS_STOOL_DIMENSION_POLICY_VERSION;
    result.stoolTopFrameDimensionsShared = result.loadDimensionSource === 'stool-top-frame';
    const loadChecker = ROOT.LoadChecker;
    const loadCheck = loadChecker && loadChecker.calculateLoadCheck ? loadChecker.calculateLoadCheck(st, spanInfo) : null;
    result.spanInfo = spanInfo;
    result.loadCheck = loadCheck;
    const geometry = deriveTrussSectionGeometry(list, st, specs);
    result.geometry = geometry;
    result.trussGeometry = geometry;
    result.structureMode = geometry.mode;
    result.truss3d = !!geometry.is3d;
    const catalogContext = getCatalogContext(options || {}, options || {}, 'truss');
    const parts = getSystemPartMap(catalogContext.equipmentItems);
    const rows = [];
    const straightPlan = buildTrussStraightRowsWithAlternatives(result, specs, parts, catalogContext);
    rows.push(...straightPlan.rows);
    const extraConnections = Math.max(0, Math.round(toNumber(straightPlan.plan && straightPlan.plan.extraConnections, 0)));
    if (extraConnections > 0) {
      result.connectionCount = toNumber(result.connectionCount, 0) + extraConnections;
      result.cq2Cones = toNumber(result.cq2Cones, 0) + extraConnections * 4;
      result.totalC2Pins = toNumber(result.totalC2Pins, 0) + extraConnections * 8;
      result.totalCotters = toNumber(result.totalCotters, 0) + extraConnections * 8;
      result.alternativeLengthExtraConnections = extraConnections;
    }
    result.alternativeLengthPlan = straightPlan.plan;
    orderedTrussSpecIds(specs).forEach(type => {
      const spec = specs[type];
      if (!spec || spec.hidden || type === 'pin' || spec.kind === 'straight') return;
      const count = Math.max(0, Math.round(toNumber(result.counts && result.counts[type], 0)));
      if (!count) return;
      const part = parts[type];
      if (!part) return;
      const unitRentalPrice = spec.kind === 'node' || spec.kind === 'base' ? 500 : 0;
      rows.push(...buildCompatiblePartRows(type, count, part, spec.kind === 'node' ? 'угол / узел фермы' : (spec.kind === 'base' ? 'опорная база' : 'позиция фермы'), { trussPart:type, meters:0, trussLengthM:0, trussStraightCount:0, rentalPrice: unitRentalPrice }, catalogContext));
    });
    if (toNumber(result.cq2Cones, 0) > 0) rows.push(...buildCompatiblePartRows('c288', result.cq2Cones, parts.c288, `${toNumber(result.connectionCount, 0)} фактических стыков × 4 шт${extraConnections ? ` · +${extraConnections} стыков от альтернативных длин` : ''}`, { trussPart:'c288' }, catalogContext));
    if (toNumber(result.baseHalfConnectors, 0) > 0) rows.push(...buildCompatiblePartRows('c383', result.baseHalfConnectors, parts.c383, `${toNumber(result.connectedBaseCount, 0)} подключ. баз × 4 шт`, { trussPart:'c383' }, catalogContext));
    if (toNumber(result.totalC2Pins, 0) > 0) rows.push(...buildCompatiblePartRows('c267', result.totalC2Pins, parts.c267, `${toNumber(result.cq2Cones, 0)} C2-88 × 2 шт + ${toNumber(result.baseHalfConnectors, 0)} C3-83 × 1 шт`, { trussPart:'c267' }, catalogContext));
    if (toNumber(result.totalCotters, 0) > 0) rows.push(...buildCompatiblePartRows('cotter', result.totalCotters, parts.cotter, `${toNumber(result.cq2Cones, 0)} C2-88 × 2 шт + ${toNumber(result.baseHalfConnectors, 0)} C3-83 × 1 шт`, { trussPart:'cotter' }, catalogContext));
    const mappedRows = compactTrussBomRows(rows).map(row => addCatalogMeta(row, catalogContext));
    return { items:list, result, rows:mappedRows, weightKg: mappedRows.reduce((sum, row) => sum + toNumber(row.weightKg, 0), 0) || toNumber(result.weight, 0), catalogMode: catalogContext.catalogMode };
  }
  function buildDefaultTrussItems(input) {
    const truss = ROOT.TrussBlockConstructor;
    const specs = truss && truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const length = Math.max(0, toNumber(input && input.lengthM, 6));
    const bases = Math.max(0, Math.round(toNumber(input && input.baseCount, 2)));
    const items = [];
    const split = truss && truss.balancedStraightSegmentTypes
      ? truss.balancedStraightSegmentTypes(length, specs, { maxPieces:16 })
      : [];
    const order = split.length ? split : ['truss3','truss25','truss2','truss15','truss1','truss05'];
    let remain = length;
    let idx = 1;
    let x = 1;
    order.forEach(type => {
      const spec = specs[type] || {};
      const len = toNumber(spec.length, 0);
      const canPlace = split.length ? len > 0 : (len > 0 && remain + 0.0001 >= len);
      while (canPlace && remain + 0.0001 >= len) {
        const item = truss && truss.createItem ? truss.createItem(`v4t${idx++}`, type, x, 1, 'h', 0, specs) : { id:`v4t${idx++}`, type, x, y:1, o:'h', r:0 };
        if (item) item.micro = Object.assign({}, item.micro || {}, { templateSplitPolicy:'balanced-v3.17.45' });
        if (item) items.push(item);
        x += Math.max(1, Math.round(len / 0.5));
        remain -= len;
        if (split.length) break;
      }
    });
    for (let i = 0; i < bases; i += 1) items.push({ id:`v4base${i + 1}`, type:'base', x:i, y:0, o:'n', r:0 });
    return items;
  }
  function buildTrussSection(input, overrides) {
    const src = input || {};
    const items = Array.isArray(src.items) && src.items.length ? src.items : buildDefaultTrussItems(src);
    const incomingGeometry = clone(src.trussGeometry || src.geometry || (src.state && (src.state.trussGeometry || src.state.geometry)) || {});
    const state = Object.assign({
      connectionCount: Math.max(0, Math.round(toNumber(src.connectionCount, 0))),
      cellMeters: toNumber(src.state && src.state.cellMeters, 0.5) || 0.5,
      trussSeries: src.trussSeries || (src.state && src.state.trussSeries) || 'T29Q',
      spanManual: toNumber(src.spanManual ?? (src.state && src.state.spanManual), 0),
      factDistributedKgM: toNumber(src.factDistributedKgM ?? (src.state && src.state.factDistributedKgM), 0),
      pointScheme: src.pointScheme || (src.state && src.state.pointScheme) || 'p1',
      factPointKg: toNumber(src.factPointKg ?? (src.state && src.state.factPointKg), 0),
      cantileverLength: toNumber(src.cantileverLength ?? (src.state && src.state.cantileverLength), 0),
      cantileverView: src.cantileverView || (src.state && src.state.cantileverView) || 'Q',
      structureMode: src.structureMode || (src.state && src.state.structureMode) || incomingGeometry.mode,
      truss3d: src.truss3d != null ? !!src.truss3d : !!(src.state && src.state.truss3d),
      trussGeometry: incomingGeometry
    }, src.state || {});
    if (Object.keys(incomingGeometry).length) state.trussGeometry = incomingGeometry;
    const catalogContext = getCatalogContext(src, overrides || {}, 'truss');
    const bom = buildTrussBomFromItems(items, state, Object.assign({}, src, { catalogMode:catalogContext.catalogMode, equipmentItems:catalogContext.equipmentItems, sourceMode:catalogContext.catalogMode }));
    bom.rows = applyTrussLinkedSubrent(bom.rows, src.subrentAssignments || (src.state && src.state.subrentAssignments));
    const res = bom.result || {};
    const geometry = res.trussGeometry || res.geometry || deriveTrussSectionGeometry(bom.items, state, ROOT.TrussBlockConstructor && ROOT.TrussBlockConstructor.getDefaultSpecs ? ROOT.TrussBlockConstructor.getDefaultSpecs() : {});
    const geometrySummary = geometry && geometry.is3d ? ` · 3D ${toNumber(geometry.widthM, 0).toFixed(1)}×${toNumber(geometry.depthM, 0).toFixed(1)}×${toNumber(geometry.heightM, 0).toFixed(1)} м` : '';
    return Object.assign({
      type:'truss',
      binderVersion:'v4-structure-' + STRUCTURE_CONFIG_VERSION,
      status:'configured',
      source:'V4StructureConfigurator',
      catalogMode:catalogContext.catalogMode,
      sourceMode:catalogContext.catalogMode,
      title:'Фермы',
      summary:`Фермы ${toNumber(res.totalMeters, 0).toFixed(1)} м · узлы ${toNumber(res.nodePieces, 0)} шт · базы ${toNumber(res.baseCount, 0)} шт · стыки ${toNumber(res.connectionCount, 0)} шт${geometrySummary}`,
      input:{ items:clone(bom.items), connectionCount:res.connectionCount, lengthM:src.lengthM, baseCount:src.baseCount, structureMode:geometry.mode, truss3d:!!geometry.is3d, trussGeometry:clone(geometry), trussSeries:state.trussSeries, spanManual:state.spanManual, factDistributedKgM:state.factDistributedKgM, pointScheme:state.pointScheme, factPointKg:state.factPointKg, cantileverLength:state.cantileverLength, cantileverView:state.cantileverView, subrentAssignments:clone(src.subrentAssignments || (src.state && src.state.subrentAssignments) || []) },
      structureMode:geometry.mode,
      truss3d:!!geometry.is3d,
      trussGeometry:clone(geometry),
      result:res,
      bomRows:bom.rows,
      sharedBomTotals:summarizeStageRows(bom.rows),
      bomBridge:{ enabled:true, sectionKey:'truss', bridgeVersion:ROOT.V4SharedBomBridge && ROOT.V4SharedBomBridge.SHARED_BOM_BRIDGE_VERSION || '', note:'Truss section is ready for shared BOM, quote_items and warehouse pick lists.' },
      rental:toNumber(overrides && Object.prototype.hasOwnProperty.call(overrides, 'rental') ? overrides.rental : res.rental, res.rental),
      weightKg:bom.weightKg,
      powerW:0,
      updatedAt:nowIso()
    }, overrides || {});
  }
  function buildSystemPartsReport(items) {
    const source = Array.isArray(items) ? items : getStoredEquipmentItems();
    const map = getSystemPartMap(source);
    const defs = partDefs();
    return {
      type:'feg-stage-pro-v4-structure-parts-report', version:STRUCTURE_CONFIG_VERSION, generatedAt:nowIso(),
      expected:defs.length,
      present:defs.filter(def => !!findSystemPart(def.key, source)).length,
      missing:defs.filter(def => !findSystemPart(def.key, source)).map(def => def.key),
      stageParts:STAGE_PARTS.map(def => map[def.key]),
      stageConstructiveCatalog:getStageConstructiveCatalog(),
      trussParts:TRUSS_PARTS.map(def => map[def.key])
    };
  }

  const api = {
    STRUCTURE_CONFIG_VERSION,
    STRUCTURE_PARTS_MIGRATION_KEY,
    TRUSS_STOOL_DIMENSION_POLICY_VERSION,
    STAGE_PARTS,
    TRUSS_PARTS,
    STAGE_DECK_VARIANTS,
    STAGE_SUPPORT_VARIANTS,
    STAGE_FRAME_VARIANTS,
    getStageConstructiveCatalog,
    getStageDefaultHeightForSupport,
    getStageFrameKeyForSupport,
    normalizeStageConfig,
    getSystemPartDefinitions: partDefs,
    ensureSystemParts,
    ensureStoredSystemParts,
    getCatalogMode,
    getCatalogContext,
    getQuickIdealItems,
    getSystemPartMap,
    ensureTrussCompatibilityMetadata,
    inferTrussPartKey,
    trussCompatibleCandidates,
    buildSystemPartsReport,
    buildStageBomFromModules,
    buildStageSharedBomSnapshot,
    buildStageSection,
    buildTrussBomFromItems,
    buildTrussSection
  };
  ROOT.V4StructureConfigurator = api;
  ensureStoredSystemParts();
})();
