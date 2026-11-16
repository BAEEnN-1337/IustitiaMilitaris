import { Scenario, NormsData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateScenario(scenario: Partial<Scenario>, normyData: NormsData): ValidationError[] {
  const errors: ValidationError[] = [];

  // ID
  if (!scenario.id || !/^S[0-9]{2}$/.test(scenario.id)) {
    errors.push({ field: 'id', message: 'ID повинен відповідати формату S01-S99' });
  }

  // Назва
  if (!scenario.nazva || scenario.nazva.trim().length < 3) {
    errors.push({ field: 'nazva', message: 'Назва повинна містити щонайменше 3 символи' });
  }

  // Версія
  if (!scenario.versiia || !/^[0-9]+\.[0-9]+$/.test(scenario.versiia)) {
    errors.push({ field: 'versiia', message: 'Версія повинна мати формат 1.0 або 0.1' });
  }

  // Дата створення
  if (!scenario.data_stvorennia || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(scenario.data_stvorennia)) {
    errors.push({ field: 'data_stvorennia', message: 'Дата створення повинна бути у форматі РРРР-ММ-ДД' });
  }

  // Тема
  const validThemes = [
    'podarunok', 'konflikt-interesiv', 'vykryvach', 'akademichna-dobrochesnist',
    'sluzhbove-maino', 'kadrovi-rishennia', 'neformalnyi-tysk', 'rozpodil-resursiv',
    'pravdyvist-zvitiv', 'inshe'
  ];
  if (!scenario.tema || !validThemes.includes(scenario.tema)) {
    errors.push({ field: 'tema', message: `Тема повинна бути однією з: ${validThemes.join(', ')}` });
  }

  // Аудиторія
  if (!scenario.audytoriia || scenario.audytoriia.length === 0) {
    errors.push({ field: 'audytoriia', message: 'Вкажіть щонайменше одну цільову аудиторію' });
  }

  // Тривалість
  if (typeof scenario.tryvalist_khv !== 'number' || scenario.tryvalist_khv < 1 || scenario.tryvalist_khv > 90) {
    errors.push({ field: 'tryvalist_khv', message: 'Тривалість має бути цілим числом від 1 до 90 хвилин' });
  }

  // Контекст
  if (!scenario.kontekst || scenario.kontekst.trim().length < 20) {
    errors.push({ field: 'kontekst', message: 'Контекст повинен містити щонайменше 20 символів' });
  }

  // Ситуація
  if (!scenario.sytuatsiia || scenario.sytuatsiia.trim().length < 50) {
    errors.push({ field: 'sytuatsiia', message: 'Опис ситуації повинен містити щонайменше 50 символів' });
  }

  // Дійові особи
  if (!scenario.diiovi_osoby || scenario.diiovi_osoby.length < 2) {
    errors.push({ field: 'diiovi_osoby', message: 'Має бути щонайменше 2 дійові особи' });
  } else {
    const roleIds = scenario.diiovi_osoby.map(r => r.id);
    if (new Set(roleIds).size !== roleIds.length) {
      errors.push({ field: 'diiovi_osoby', message: 'ID дійових осіб не повинні повторюватися' });
    }
    for (const r of scenario.diiovi_osoby) {
      if (!/^R[0-9]+$/.test(r.id)) {
        errors.push({ field: 'diiovi_osoby', message: `ID ролі "${r.id}" повинен мати формат R1, R2 тощо` });
      }
    }
    const playerCount = scenario.diiovi_osoby.filter(r => r.hravets === true).length;
    if (playerCount !== 1) {
      errors.push({ field: 'diiovi_osoby', message: `Має бути рівно одна роль користувача (hravets: true). Наразі: ${playerCount}` });
    }
  }

  // Цінності в конфлікті
  if (!scenario.tsinnosti_v_konflikti || scenario.tsinnosti_v_konflikti.length === 0) {
    errors.push({ field: 'tsinnosti_v_konflikti', message: 'Вкажіть щонайменше одну пару конфліктуючих цінностей' });
  }

  // Вузли та звʼязки
  if (!scenario.vuzly || scenario.vuzly.length === 0) {
    errors.push({ field: 'vuzly', message: 'Сценарій повинен містити хоча б один вузол рішення' });
    return errors;
  }

  const vuzlyMap = new Map(scenario.vuzly.map(v => [v.id, v]));
  if (vuzlyMap.size !== scenario.vuzly.length) {
    errors.push({ field: 'vuzly', message: 'Повторювані ID вузлів у сценарії' });
  }

  // Початковий вузол
  if (!scenario.pochatkovyi_vuzol || !vuzlyMap.has(scenario.pochatkovyi_vuzol)) {
    errors.push({ field: 'pochatkovyi_vuzol', message: `Початкового вузла "${scenario.pochatkovyi_vuzol}" немає серед створених вузлів` });
  } else {
    const startNode = vuzlyMap.get(scenario.pochatkovyi_vuzol)!;
    if (!startNode.varianty || startNode.varianty.length < 3 || startNode.varianty.length > 4) {
      errors.push({ field: 'vuzly', message: `У початковому вузлі має бути 3–4 варіанти дій (маємо ${startNode.varianty?.length || 0})` });
    }
  }

  // Варіанти, їхні ID та норми
  const allVariantIds: string[] = [];
  const knownNormIds = new Set(normyData.normy.map(n => n.id));
  const scenarioNormIds = new Set(scenario.normy?.map(n => n.id) || []);

  for (const vz of scenario.vuzly) {
    if (!/^V[0-9]+$/.test(vz.id)) {
      errors.push({ field: 'vuzly', message: `ID вузла "${vz.id}" повинен мати формат V1, V2 тощо` });
    }
    if (!vz.varianty || vz.varianty.length < 2 || vz.varianty.length > 4) {
      errors.push({ field: 'vuzly', message: `Вузол ${vz.id} повинен містити від 2 до 4 варіантів відповідей` });
    }
    for (const v of vz.varianty || []) {
      if (!/^[A-Z][0-9]?$/.test(v.id)) {
        errors.push({ field: 'varianty', message: `ID варіанта "${v.id}" у вузлі ${vz.id} повинен відповідати шаблону ^[A-Z][0-9]?$ (наприклад, A, B, E1, F2)` });
      }
      allVariantIds.push(v.id);

      // Перевірка балів -2..+2
      const b = v.baly;
      if (!b || typeof b.dobrochesnist !== 'number' || typeof b.efektyvnist !== 'number' || typeof b.dovira !== 'number') {
        errors.push({ field: 'baly', message: `Варіант ${v.id}: бали повинні бути визначені для доброчесності, ефективності та довіри` });
      } else {
        if (b.dobrochesnist < -2 || b.dobrochesnist > 2 ||
            b.efektyvnist < -2 || b.efektyvnist > 2 ||
            b.dovira < -2 || b.dovira > 2) {
          errors.push({ field: 'baly', message: `Варіант ${v.id}: бали за кожною віссю мають бути в межах від -2 до +2` });
        }
      }

      // Наступний вузол
      if (v.nastupnyi_vuzol !== null && v.nastupnyi_vuzol !== undefined && v.nastupnyi_vuzol !== '') {
        if (!vuzlyMap.has(v.nastupnyi_vuzol)) {
          errors.push({ field: 'nastupnyi_vuzol', message: `Варіант ${v.id} посилається на неіснуючий наступний вузол "${v.nastupnyi_vuzol}"` });
        }
      }

      // Норми
      for (const n of v.normy || []) {
        if (!knownNormIds.has(n)) {
          errors.push({ field: 'normy', message: `Варіант ${v.id} посилається на норму "${n}", якої немає в normy.json` });
        } else if (!scenarioNormIds.has(n)) {
          errors.push({ field: 'normy', message: `Норма "${n}" з варіанта ${v.id} не додана до загального переліку норм сценарію` });
        }
      }
    }
  }

  if (new Set(allVariantIds).size !== allVariantIds.length) {
    errors.push({ field: 'varianty', message: 'ID варіантів відповідей повинні бути унікальними в межах усього сценарію' });
  }

  // Досяжність усіх вузлів із початкового
  if (scenario.pochatkovyi_vuzol && vuzlyMap.has(scenario.pochatkovyi_vuzol)) {
    const reachable = new Set<string>();
    const queue = [scenario.pochatkovyi_vuzol];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const node = vuzlyMap.get(current);
      if (node && node.varianty) {
        for (const varItem of node.varianty) {
          if (varItem.nastupnyi_vuzol && vuzlyMap.has(varItem.nastupnyi_vuzol)) {
            queue.push(varItem.nastupnyi_vuzol);
          }
        }
      }
    }

    for (const v of scenario.vuzly) {
      if (!reachable.has(v.id)) {
        errors.push({ field: 'vuzly', message: `Вузол ${v.id} недосяжний із початкового вузла ${scenario.pochatkovyi_vuzol}` });
      }
    }
  }

  return errors;
}
