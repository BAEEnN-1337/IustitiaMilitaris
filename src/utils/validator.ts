import { ui } from '../i18n/ui';
import { Scenario, NormsData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateScenario(scenario: Partial<Scenario>, normyData: NormsData, lang: import('../i18n').Language = 'uk'): ValidationError[] {
  const errors: ValidationError[] = [];

  // ID
  if (!scenario.id || !/^S[0-9]{2}$/.test(scenario.id)) {
    errors.push({ field: 'id', message: ui(lang, 'm224') });
  }

  // Назва
  if (!scenario.nazva || scenario.nazva.trim().length < 3) {
    errors.push({ field: 'nazva', message: ui(lang, 'm225') });
  }

  // Версія
  if (!scenario.versiia || !/^[0-9]+\.[0-9]+$/.test(scenario.versiia)) {
    errors.push({ field: 'versiia', message: ui(lang, 'm226') });
  }

  // Дата створення
  if (!scenario.data_stvorennia || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(scenario.data_stvorennia)) {
    errors.push({ field: 'data_stvorennia', message: ui(lang, 'm227') });
  }

  // Тема
  const validThemes = [
    'podarunok', 'konflikt-interesiv', 'vykryvach', 'akademichna-dobrochesnist',
    'sluzhbove-maino', 'kadrovi-rishennia', 'neformalnyi-tysk', 'rozpodil-resursiv',
    'pravdyvist-zvitiv', 'inshe'
  ];
  if (!scenario.tema || !validThemes.includes(scenario.tema)) {
    errors.push({ field: 'tema', message: ui(lang, 'm228', validThemes.join(', ')) });
  }

  // Аудиторія
  if (!scenario.audytoriia || scenario.audytoriia.length === 0) {
    errors.push({ field: 'audytoriia', message: ui(lang, 'm229') });
  }

  // Тривалість
  if (typeof scenario.tryvalist_khv !== 'number' || scenario.tryvalist_khv < 1 || scenario.tryvalist_khv > 90) {
    errors.push({ field: 'tryvalist_khv', message: ui(lang, 'm230') });
  }

  // Контекст
  if (!scenario.kontekst || scenario.kontekst.trim().length < 20) {
    errors.push({ field: 'kontekst', message: ui(lang, 'm231') });
  }

  // Ситуація
  if (!scenario.sytuatsiia || scenario.sytuatsiia.trim().length < 50) {
    errors.push({ field: 'sytuatsiia', message: ui(lang, 'm232') });
  }

  // Дійові особи
  if (!scenario.diiovi_osoby || scenario.diiovi_osoby.length < 2) {
    errors.push({ field: 'diiovi_osoby', message: ui(lang, 'm233') });
  } else {
    const roleIds = scenario.diiovi_osoby.map(r => r.id);
    if (new Set(roleIds).size !== roleIds.length) {
      errors.push({ field: 'diiovi_osoby', message: ui(lang, 'm234') });
    }
    for (const r of scenario.diiovi_osoby) {
      if (!/^R[0-9]+$/.test(r.id)) {
        errors.push({ field: 'diiovi_osoby', message: ui(lang, 'm235', r.id) });
      }
    }
    const playerCount = scenario.diiovi_osoby.filter(r => r.hravets === true).length;
    if (playerCount !== 1) {
      errors.push({ field: 'diiovi_osoby', message: ui(lang, 'm236', playerCount) });
    }
  }

  // Цінності в конфлікті
  if (!scenario.tsinnosti_v_konflikti || scenario.tsinnosti_v_konflikti.length === 0) {
    errors.push({ field: 'tsinnosti_v_konflikti', message: ui(lang, 'm237') });
  }

  // Вузли та звʼязки
  if (!scenario.vuzly || scenario.vuzly.length === 0) {
    errors.push({ field: 'vuzly', message: ui(lang, 'm238') });
    return errors;
  }

  const vuzlyMap = new Map(scenario.vuzly.map(v => [v.id, v]));
  if (vuzlyMap.size !== scenario.vuzly.length) {
    errors.push({ field: 'vuzly', message: ui(lang, 'm239') });
  }

  // Початковий вузол
  if (!scenario.pochatkovyi_vuzol || !vuzlyMap.has(scenario.pochatkovyi_vuzol)) {
    errors.push({ field: 'pochatkovyi_vuzol', message: ui(lang, 'm240', scenario.pochatkovyi_vuzol) });
  } else {
    const startNode = vuzlyMap.get(scenario.pochatkovyi_vuzol)!;
    if (!startNode.varianty || startNode.varianty.length < 3 || startNode.varianty.length > 4) {
      errors.push({ field: 'vuzly', message: ui(lang, 'm241', startNode.varianty?.length || 0) });
    }
  }

  // Варіанти, їхні ID та норми
  const allVariantIds: string[] = [];
  const knownNormIds = new Set(normyData.normy.map(n => n.id));
  const scenarioNormIds = new Set(scenario.normy?.map(n => n.id) || []);

  for (const vz of scenario.vuzly) {
    if (!/^V[0-9]+$/.test(vz.id)) {
      errors.push({ field: 'vuzly', message: ui(lang, 'm242', vz.id) });
    }
    if (!vz.varianty || vz.varianty.length < 2 || vz.varianty.length > 4) {
      errors.push({ field: 'vuzly', message: ui(lang, 'm243', vz.id) });
    }
    for (const v of vz.varianty || []) {
      if (!/^[A-Z][0-9]?$/.test(v.id)) {
        errors.push({ field: 'varianty', message: ui(lang, 'm244', v.id, vz.id) });
      }
      allVariantIds.push(v.id);

      // Перевірка балів -2..+2
      const b = v.baly;
      if (!b || typeof b.dobrochesnist !== 'number' || typeof b.efektyvnist !== 'number' || typeof b.dovira !== 'number') {
        errors.push({ field: 'baly', message: ui(lang, 'm245', v.id) });
      } else {
        if (b.dobrochesnist < -2 || b.dobrochesnist > 2 ||
            b.efektyvnist < -2 || b.efektyvnist > 2 ||
            b.dovira < -2 || b.dovira > 2) {
          errors.push({ field: 'baly', message: ui(lang, 'm246', v.id) });
        }
      }

      // Наступний вузол
      if (v.nastupnyi_vuzol !== null && v.nastupnyi_vuzol !== undefined && v.nastupnyi_vuzol !== '') {
        if (!vuzlyMap.has(v.nastupnyi_vuzol)) {
          errors.push({ field: 'nastupnyi_vuzol', message: ui(lang, 'm247', v.id, v.nastupnyi_vuzol) });
        }
      }

      // Норми
      for (const n of v.normy || []) {
        if (!knownNormIds.has(n)) {
          errors.push({ field: 'normy', message: ui(lang, 'm248', v.id, n) });
        } else if (!scenarioNormIds.has(n)) {
          errors.push({ field: 'normy', message: ui(lang, 'm249', n, v.id) });
        }
      }
    }
  }

  if (new Set(allVariantIds).size !== allVariantIds.length) {
    errors.push({ field: 'varianty', message: ui(lang, 'm250') });
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
        errors.push({ field: 'vuzly', message: ui(lang, 'm251', v.id, scenario.pochatkovyi_vuzol) });
      }
    }
  }

  return errors;
}
