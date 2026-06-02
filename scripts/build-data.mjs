#!/usr/bin/env node
/**
 * build-data.mjs
 * Reads beany-sim-v2 runs/ directories and generates frontend/data/run-data.js
 *
 * Usage: node scripts/build-data.mjs
 * Output: data/run-data.js (loaded by game.html via <script>)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNS_BASE = '/home/blackcat/.openclaw/beany-sim-v2/runs';
const OUTPUT = path.resolve(__dirname, '..', 'data', 'run-data.js');

const RUN_DIRS = ['run_02_p06_zhengyin', 'run_03_p06_shishen'];

// Element → color mapping for Beany circle
const ELEM_COLORS = {
  wood: '#4CAF50',
  fire: '#FF5722',
  earth: '#8D6E63',
  metal: '#FFC107',
  water: '#2196F3',
};

// Element → Chinese name
const ELEM_CN = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

// Age stage → display
const AGE_LABELS = {
  childhood: '幼年', youth: '青年', middle: '中年', stable: '稳定期',
};

function parseNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function readRun(runId) {
  const base = path.join(RUNS_BASE, runId);
  if (!fs.existsSync(base)) {
    console.warn(`  ⚠️  ${runId} not found, skipping`);
    return null;
  }

  console.log(`  Reading ${runId}...`);

  // Read persona_state.json
  const psPath = path.join(base, 'persona_state.json');
  const personaState = JSON.parse(fs.readFileSync(psPath, 'utf-8'));

  // Read config.md
  const cfgPath = path.join(base, 'config.md');
  let config = {};
  if (fs.existsSync(cfgPath)) {
    const cfgText = fs.readFileSync(cfgPath, 'utf-8');
    const lines = cfgText.split('\n');
    lines.forEach(line => {
      const m = line.match(/^\*\*(.+?):\*\*\s*(.+)/);
      if (m) config[m[1].trim()] = m[2].trim();
    });
  }

  // Read scene_log.md
  const slPath = path.join(base, 'scene_log.md');
  let sceneLog = '';
  if (fs.existsSync(slPath)) {
    sceneLog = fs.readFileSync(slPath, 'utf-8');
  }

  // Determine persona name from rounds files
  const nodesDir = path.join(base, 'nodes');
  if (!fs.existsSync(nodesDir)) { console.warn(`  ⚠️  No nodes/ dir in ${runId}`); return null; }

  const nodeDirs = fs.readdirSync(nodesDir).filter(d => d.startsWith('day')).sort();

  // Determine persona name (林小姐 or 阿青 or whatever)
  let personaName = '主人';
  for (const nd of nodeDirs) {
    const rDir = path.join(nodesDir, nd, 'rounds');
    if (fs.existsSync(rDir)) {
      const files = fs.readdirSync(rDir);
      const personFile = files.find(f => !f.includes('Beany'));
      if (personFile) {
        personaName = personFile.replace(/R\d{2}_(.+)\.md$/, '$1');
        break;
      }
    }
  }

  // Extract shishen and dominant from persona state
  const shishen = personaState.shishen || config['十神'] || (runId.includes('zhengyin') ? '正印' : '食神');
  const dominantElement = personaState.dominant_element || 'wood';
  const ageStage = personaState.age_stage || 'childhood';

  const runData = {
    runId,
    personaName,
    personaLabel: '情感依赖型主人',
    shishen,
    dominantElement,
    dominantElementCn: ELEM_CN[dominantElement] || dominantElement,
    ageStage,
    ageStageLabel: AGE_LABELS[ageStage] || ageStage,
    color: ELEM_COLORS[dominantElement] || '#888',
    finalStats: {
      weights: personaState.weights || {},
      fiveAxis: personaState['5_axis'] || {},
      health: personaState.health || 50,
    },
    nodes: {},
  };

  // Process each node directory
  for (const nodeId of nodeDirs.sort()) {
    const nodePath = path.join(nodesDir, nodeId);

    // Read node.json
    const njPath = path.join(nodePath, 'node.json');
    if (!fs.existsSync(njPath)) { continue; }
    const nodeJson = JSON.parse(fs.readFileSync(njPath, 'utf-8'));

    // Read world_state.md
    const wsPath = path.join(nodePath, 'world_state.md');
    let worldState = '';
    if (fs.existsSync(wsPath)) {
      worldState = fs.readFileSync(wsPath, 'utf-8').trim();
    }

    // Read rounds
    const roundsDir = path.join(nodePath, 'rounds');
    const rounds = [];
    if (fs.existsSync(roundsDir)) {
      let roundFiles = fs.readdirSync(roundsDir).sort();
      
      // Detect per-node persona name (some nodes use different names)
      let perNodePersona = personaName;
      const personFileInNode = roundFiles.find(f => !f.includes('Beany') && !f.endsWith('.md.bak'));
      if (personFileInNode) {
        const detected = personFileInNode.replace(/R\d{1,2}_(.+)\.md$/, '$1');
        if (detected && detected.length < 10) perNodePersona = detected;
      }
      
      const personFiles = roundFiles.filter(f => f.includes(perNodePersona));
      const beanyFiles = roundFiles.filter(f => f.includes('Beany'));

      for (let i = 0; i < personFiles.length; i++) {
        const rNum = i + 1;
        const padNum = String(rNum).padStart(2, '0');

        // Person action — try zero-padded first, then non-padded
        let perFile = personFiles.find(f => f.startsWith(`R${padNum}_`));
        if (!perFile) {
          perFile = personFiles.find(f => f.startsWith(`R${rNum}_`));
        }
        let personAction = { mood: '', reason: '', action: '' };
        if (perFile) {
          const perText = fs.readFileSync(path.join(roundsDir, perFile), 'utf-8');
          // Try various formats
          const moodM = perText.match(/心情[：:]\s*(.+)/);
          const reasonM = perText.match(/因为[：:]\s*(.+)/);
          const actionM = perText.match(/(?:对Beany|对小猫|对宠物)[：:]\s*(.+)/);

          personAction = {
            mood: moodM ? moodM[1].trim() : '',
            reason: reasonM ? reasonM[1].trim() : '',
            action: actionM ? actionM[1].trim() : '',
          };

          // Fallback: if the file has **Person: ** format (食神-style)
          if (!personAction.action) {
            const textMatch = perText.match(/\*\*(?:林小姐|阿青|主人)[：:]\*\*(.+)/);
            if (textMatch) {
              // Try to split mood/reason/action from inline text
              const fullText = textMatch[1].trim();
              personAction.action = fullText;
            }
          }
        }

        // Beany reaction — try zero-padded first, then non-padded
        let beaFile = beanyFiles.find(f => f.startsWith(`R${padNum}_`));
        if (!beaFile) {
          beaFile = beanyFiles.find(f => f.startsWith(`R${rNum}_`));
        }
        let beanyReaction = { mood: '', meaning: '', action: '' };
        if (beaFile) {
          const beaText = fs.readFileSync(path.join(roundsDir, beaFile), 'utf-8');
          const moodM = beaText.match(/心情[：:]\s*(.+)/);
          const meaningM = beaText.match(/(?:意思|含义)[：:]\s*(.+)/);
          const actionM = beaText.match(/动作[：:]\s*(.+)/);

          beanyReaction = {
            mood: moodM ? moodM[1].trim() : '',
            meaning: meaningM ? meaningM[1].trim() : '',
            action: actionM ? actionM[1].trim() : '',
          };
        }

        rounds.push({
          round: rNum,
          personAction,
          beanyReaction,
        });
      }
    }

    runData.nodes[nodeId] = {
      day: nodeJson.day || 1,
      session: nodeJson.session || 1,
      eventType: nodeJson.event_type || '',
      environment: nodeJson.environment || worldState || '',
      appUi: nodeJson.app_ui || {},
      personalityDelta: nodeJson.personality_delta || {},
      fiveAxis: nodeJson['5_axis'] || {},
      entryConditions: nodeJson.entry_conditions || {},
      importanceScore: nodeJson.importance_score || 0,
      rounds,
    };
  }

  return runData;
}

function build() {
  console.log('🔨 Building frontend data from runs/ folders...\n');

  const allRuns = {};
  for (const runId of RUN_DIRS) {
    const data = readRun(runId);
    if (data) {
      allRuns[runId] = data;
      console.log(`  ✅ ${runId}: ${Object.keys(data.nodes).length} nodes, ${data.personaName}`);
    }
  }

  const output = `// Auto-generated by build-data.mjs
// DO NOT EDIT — run "node scripts/build-data.mjs" to regenerate

const RUN_DATA = ${JSON.stringify(allRuns, null, 2)};

const ELEM_COLORS = {
  wood: '#4CAF50',
  fire: '#FF5722', 
  earth: '#8D6E63',
  metal: '#FFC107',
  water: '#2196F3',
};

const ELEM_CN = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};
`;

  fs.writeFileSync(OUTPUT, output, 'utf-8');
  console.log(`\n📦  Written to ${OUTPUT}`);
  console.log(`   Size: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB\n`);
}

build();
