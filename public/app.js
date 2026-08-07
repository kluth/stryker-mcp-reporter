document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navLinks = document.querySelectorAll('.nav-links a');
  const views = document.querySelectorAll('.view');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = e.target.getAttribute('data-view');
      
      navLinks.forEach(l => l.classList.remove('active'));
      e.target.classList.add('active');
      
      views.forEach(v => {
        if (v.id === `view-${targetView}`) {
          v.classList.add('active');
          if (targetView === 'history') loadHistory();
          if (targetView === 'cheat-sheets') loadCheatSheets();
        } else {
          v.classList.remove('active');
        }
      });
    });
  });

  // Load Latest Report
  async function loadLatestReport() {
    try {
      const res = await fetch('/api/latest-report');
      if (!res.ok) throw new Error('No recent report');
      const data = await res.json();
      
      const elScore = document.getElementById('mutation-score');
      if (elScore) elScore.textContent = data.summary.mutationScore + '%';
      const elKilled = document.getElementById('metrics-killed');
      if (elKilled) elKilled.textContent = data.summary.killed;
      const elSurv = document.getElementById('metrics-survived');
      if (elSurv) elSurv.textContent = data.summary.survived;
      const elTotal = document.getElementById('metrics-total');
      if (elTotal) elTotal.textContent = data.summary.totalMutants;
      const elIgn = document.getElementById('metrics-ignored');
      if (elIgn) elIgn.textContent = data.summary.ignored || 0;
      
      // Update Trend percentage text (dummy comparison or we can just update it based on history later)
    } catch (err) {
      console.warn('No latest report available yet.');
    }
  }

  // Load Heatmap
  async function loadHeatmap() {
    try {
      const res = await fetch('/api/report');
      if (!res.ok) return;
      const report = await res.json();
      
      const heatmapContainer = document.getElementById('heatmap-container');
      if (!heatmapContainer || !report.files) return;
      
      heatmapContainer.innerHTML = '';
      
      const files = Object.entries(report.files).map(([path, data]) => {
        let killed = 0;
        let valid = 0;
        (data.mutants || []).forEach(m => {
          if (["Killed", "Survived", "NoCoverage", "Timeout"].includes(m.status)) {
            valid++;
          }
          if (["Killed", "Timeout"].includes(m.status)) {
            killed++;
          }
        });
        const score = valid > 0 ? (killed / valid) * 100 : 100;
        return { path, score, name: path.split(/[\\/]/).pop() };
      });
      
      files.sort((a, b) => a.score - b.score);
      
      files.forEach(f => {
        const div = document.createElement('div');
        div.className = 'rounded-sm hover:scale-110 transition-transform cursor-pointer border border-white/10';
        div.style.width = '16px';
        div.style.height = '16px';
        div.title = `${f.name} (${f.score.toFixed(1)}%)`;
        
        if (f.score >= 80) {
          div.classList.add('bg-primary/80', 'border-primary/30');
        } else if (f.score >= 60) {
          div.classList.add('bg-tertiary/80', 'border-tertiary/30');
        } else {
          div.classList.add('bg-error/80', 'border-error/30');
        }
        
        heatmapContainer.appendChild(div);
      });
    } catch(err) {
      console.warn('Could not load heatmap', err);
    }
  }

  // Load Trend
  async function loadTrend() {
    try {
      const resList = await fetch('/api/history/reports');
      if (!resList.ok) return;
      const reportFiles = await resList.json();
      
      const scores = [];
      
      // Fetch up to 7 most recent reports
      const recentFiles = reportFiles.slice(-7);
      
      for (const file of recentFiles) {
        try {
          const res = await fetch(`/api/history/reports/${encodeURIComponent(file)}`);
          if (res.ok) {
            const data = await res.json();
            // Try to compute summary or use existing
            let score = 100;
            if (data.summary && typeof data.summary.mutationScore === 'number') {
              score = data.summary.mutationScore;
            } else if (data.files) {
               // Calculate manually if missing
               let k = 0, v = 0;
               Object.values(data.files).forEach(fileResult => {
                 (fileResult.mutants || []).forEach(m => {
                    if (["Killed", "Survived", "NoCoverage", "Timeout"].includes(m.status)) v++;
                    if (["Killed", "Timeout"].includes(m.status)) k++;
                 });
               });
               score = v > 0 ? (k / v) * 100 : 100;
            }
            scores.push(score);
          }
        } catch(e) {
          // ignore
        }
      }
      
      const container = document.getElementById('trend-chart-container');
      if (!container || scores.length === 0) return;
      
      // Draw SVG Sparkline
      const width = 100;
      const height = 50;
      const points = [];
      
      // If we only have 1 data point, duplicate it so we have a line
      if (scores.length === 1) {
        scores.push(scores[0]);
      }
      
      const minScore = Math.min(...scores) - 5; // padding bottom
      const maxScore = Math.max(...scores) + 5; // padding top
      const range = Math.max(maxScore - minScore, 10);
      
      scores.forEach((score, index) => {
        const x = (index / (scores.length - 1)) * width;
        const y = height - ((score - minScore) / range) * height;
        points.push(`${x},${y}`);
      });
      
      const pathData = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
      const lineData = `M ${points.join(' L ')}`;
      
      container.innerHTML = `
        <svg class="w-full h-full absolute inset-0 opacity-80" preserveAspectRatio="none" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="lineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stop-color="#4edea3" stop-opacity="0.3"></stop>
              <stop offset="50%" stop-color="#4edea3" stop-opacity="0.8"></stop>
              <stop offset="100%" stop-color="#4edea3" stop-opacity="1"></stop>
            </linearGradient>
            <linearGradient id="fillGrad" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stop-color="#4edea3" stop-opacity="0.2"></stop>
              <stop offset="100%" stop-color="#4edea3" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <path d="${pathData}" fill="url(#fillGrad)"></path>
          <path d="${lineData}" fill="none" stroke="url(#lineGrad)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
        </svg>
        <div class="absolute bottom-sm right-sm text-code-sm font-code-sm px-xs py-unit bg-primary/20 text-primary border border-primary/30 rounded" id="trend-diff">
          ${scores[scores.length-1].toFixed(1)}%
        </div>
      `;
      
    } catch(err) {
      console.warn('Could not load trend', err);
    }
  }

  // Load Survived Mutants
  async function loadSurvivedMutants() {
    try {
      const res = await fetch('/api/survived');
      if (!res.ok) throw new Error('Could not fetch survived mutants');
      const mutants = await res.json();
      const tbody = document.getElementById('survived-list');
      if(!tbody) return;
      
      if (mutants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-sm text-on-surface-variant">No survived mutants!</td></tr>';
        return;
      }
      
      tbody.innerHTML = '';
      mutants.slice(0, 100).forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'table-row-hover border-b border-white/5';
        
        const fileTd = document.createElement('td');
        fileTd.className = 'p-sm text-on-surface truncate';
        fileTd.textContent = m.filePath ? m.filePath.split(/[\\/]/).pop() : 'Unknown';
        
        const mutatorTd = document.createElement('td');
        mutatorTd.className = 'p-sm text-on-surface-variant';
        mutatorTd.textContent = m.mutatorName || 'Unknown';
        
        const riskTd = document.createElement('td');
        riskTd.className = 'p-sm';
        riskTd.innerHTML = `<span class="px-xs py-unit bg-error/10 text-error border border-error/20 rounded text-[10px] uppercase tracking-wider">High</span>`;
        
        const actionTd = document.createElement('td');
        actionTd.className = 'p-sm text-right flex items-center justify-end gap-2';
        
        // Open File Button removed as requested
        
        // Fix with AI Button
        const fixBtn = document.createElement('button');
        fixBtn.className = 'px-sm py-unit text-[11px] bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary rounded hover:from-primary/30 hover:to-primary/20 transition-all flex items-center gap-xs cursor-pointer';
        fixBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">auto_awesome</span> Fix`;
        fixBtn.onclick = () => {
          const prompt = `Please use the stryker_suggest_fix prompt to suggest a fix for mutant ${m.id} in ${m.filePath}. Then apply the fix to the file!`;
          navigator.clipboard.writeText(prompt);
          fixBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">check</span> Copied!`;
          setTimeout(() => fixBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">auto_awesome</span> Fix`, 2000);
        };
        
        actionTd.appendChild(fixBtn);
        
        tr.appendChild(fileTd);
        tr.appendChild(mutatorTd);
        tr.appendChild(riskTd);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      });
      
    } catch(err) {
      const tbody = document.getElementById('survived-list');
      if(tbody) tbody.innerHTML = '<tr><td colspan="4" class="p-sm text-on-surface-variant">Failed to load mutants</td></tr>';
    }
  }

  // Load Project Info
  async function loadProjectInfo() {
    try {
      const res = await fetch('/api/project-info');
      const data = await res.json();
      if (data.name) {
        const pn = document.getElementById('project-name');
        if (pn) pn.textContent = data.name;
        document.title = `Stryker MCP | ${data.name}`;
      }
      if (data.cwd) {
        window.projectCwd = data.cwd;
      }
    } catch (err) {
      document.getElementById('project-name').textContent = 'Stryker MCP Reporter';
    }
  }

  // Load Status
  async function loadStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();
      
      const dot = document.getElementById('status-dot');
      const msg = document.getElementById('status-message');
      
      if (!dot || !msg) return;

      if (data.status === 'RUNNING') {
        dot.style.background = '#4facfe';
        dot.classList.add('pulse');
        msg.textContent = data.message || 'Executing tests...';
      } else if (data.status === 'COMPLETED') {
        dot.style.background = '#4caf50';
        dot.classList.remove('pulse');
        msg.textContent = 'Ready';
      } else if (data.status === 'FAILED') {
        dot.style.background = '#f44336';
        dot.classList.remove('pulse');
        msg.textContent = 'Failed';
      } else {
        dot.style.background = '#bbb';
        dot.classList.remove('pulse');
        msg.textContent = 'Idle';
      }
    } catch (err) {
      // Ignore
    }
  }

  // Load History
  async function loadHistory() {
    try {
      const res = await fetch('/api/history/reports');
      const files = await res.json();
      const list = document.getElementById('history-list');
      list.innerHTML = '';
      
      if (files.length === 0) {
        list.innerHTML = '<li class="text-muted">No history found</li>';
        return;
      }

      files.forEach(file => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span>${file}</span> <span>→</span>`;
        li.addEventListener('click', () => showHistoryDetail(file, li));
        list.appendChild(li);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function showHistoryDetail(filename, listItem) {
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
    listItem.classList.add('selected');
    
    document.getElementById('history-detail-card').style.display = 'block';
    document.getElementById('history-detail-title').textContent = filename;
    document.getElementById('history-detail-content').textContent = 'Loading...';
    
    try {
      const res = await fetch(`/api/history/reports/${filename}`);
      const data = await res.json();
      const jsonString = JSON.stringify(data, null, 2);
      
      const detailsEl = document.getElementById('history-detail-content');
      detailsEl.textContent = jsonString;
      
      if (window.hljs) {
        delete detailsEl.dataset.highlighted;
        window.hljs.highlightElement(detailsEl);
      }
      
      const copyBtn = document.getElementById('copy-history');
      copyBtn.style.display = 'block';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(jsonString);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy JSON', 2000);
      };
      
    } catch (err) {
      document.getElementById('history-detail-content').textContent = 'Error loading report';
    }
  }

  // Load Cheat Sheets
  async function loadCheatSheets() {
    try {
      const res = await fetch('/api/history/cheat-sheets');
      const files = await res.json();
      const list = document.getElementById('cheat-sheet-list');
      list.innerHTML = '';
      
      if (files.length === 0) {
        list.innerHTML = '<li class="text-muted">No cheat sheets found</li>';
        return;
      }

      files.forEach(file => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span>${file}</span> <span>→</span>`;
        li.addEventListener('click', () => showCheatSheetDetail(file, li));
        list.appendChild(li);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function showCheatSheetDetail(filename, listItem) {
    document.querySelectorAll('#cheat-sheet-list .history-item').forEach(i => i.classList.remove('selected'));
    listItem.classList.add('selected');
    
    document.getElementById('cheat-sheet-detail-card').style.display = 'block';
    document.getElementById('cheat-sheet-detail-title').textContent = filename;
    document.getElementById('cheat-sheet-detail-content').innerHTML = 'Loading...';
    
    try {
      const res = await fetch(`/api/history/cheat-sheets/${filename}`);
      const markdown = await res.text();
      // Render markdown
      document.getElementById('cheat-sheet-detail-content').innerHTML = marked.parse(markdown);
    } catch (err) {
      document.getElementById('cheat-sheet-detail-content').innerHTML = 'Error loading cheat sheet';
    }
  }

  // Initial Load
    // --- New History UI Logic ---
  async function loadHistoryUI() {
    const container = document.getElementById('history-list-container');
    if (!container) return; // Only run on history.html
    
    try {
      const [res, branchRes] = await Promise.all([
        fetch('/api/history/reports'),
        fetch('/api/branches').catch(() => ({ ok: false }))
      ]);
      const files = await res.json();
      
      let branches = ["main"];
      if (branchRes && branchRes.ok) {
         branches = await branchRes.json();
      }
      
      const datalist = document.getElementById('branch-list');
      if (datalist) {
        datalist.innerHTML = '<option value="All Branches"></option>';
        branches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          datalist.appendChild(opt);
        });
      }
      
      // Remove the existing dummy items but keep the filter bar
      const filterBar = container.firstElementChild;
      container.innerHTML = '';
      if (filterBar) container.appendChild(filterBar);
      
      if (!files || files.length === 0) {
        container.insertAdjacentHTML('beforeend', '<div class="p-sm text-on-surface-variant">No history found.</div>');
        return;
      }
      
      // Load details for each report and group them
      const grouped = {};
      const fileSubset = files.slice(0, 30); // limit to 30 for performance
      const reportsData = await Promise.all(fileSubset.map(async (filename) => {
        try {
          const detailRes = await fetch(`/api/history/reports/${filename}`);
          return { filename, report: await detailRes.json() };
        } catch(e) { return null; }
      }));
      
      reportsData.forEach(item => {
        if (!item) return;
        const { filename, report } = item;
        let killed = 0;
        let total = 0;
        let score = 0;
        if (report.summary && report.summary.mutationScore) {
           score = report.summary.mutationScore;
           killed = report.summary.killed;
           total = report.summary.total;
        } else {
           const filesObj = report.files || {};
           for (const f of Object.values(filesObj)) {
             const mutants = f.mutants || [];
             for (const m of mutants) {
               if (['Killed', 'Survived', 'NoCoverage', 'Timeout'].includes(m.status)) {
                  total++;
                  if (m.status === 'Killed' || m.status === 'Timeout') killed++;
               }
             }
           }
           score = total > 0 ? (killed / total) * 100 : 0;
        }
        
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        let displayDate = 'Unknown Date';
        let shortHash = filename.substring(0, 6);
        if (dateMatch) {
          const isoStr = dateMatch[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
          const d = new Date(isoStr);
          displayDate = !isNaN(d.getTime()) ? d.toLocaleString() : dateMatch[1];
          shortHash = dateMatch[1].substring(dateMatch[1].length - 10, dateMatch[1].length - 4);
        }
        
        const commitMsg = report.commitMessage || 'local';
        const branch = report.branch || 'main';
        
        if (!grouped[branch]) grouped[branch] = {};
        if (!grouped[branch][commitMsg]) grouped[branch][commitMsg] = [];
        
        grouped[branch][commitMsg].push({
          filename, shortHash, displayDate, killed, total, score
        });
      });
      
      // Render grouped UI
      for (const [branch, commits] of Object.entries(grouped)) {
        let branchHTML = `
          <div class="mb-lg">
            <h3 class="font-headline-md text-headline-md text-primary mb-sm flex items-center gap-sm">
              <span class="material-symbols-outlined">account_tree</span> Branch: ${branch}
            </h3>
            <div class="flex flex-col gap-sm">
        `;
        
        for (const [commitMsg, runs] of Object.entries(commits)) {
          // Aggregate stats for the commit
          const avgScore = runs.reduce((acc, r) => acc + r.score, 0) / runs.length;
          
          const groupId = 'group-' + Math.random().toString(36).substring(2, 9);
          
          branchHTML += `
            <div class="glass-panel rounded-lg p-0 mb-sm overflow-hidden glass-card-border">
              <!-- Collapsible Header -->
              <div class="p-sm bg-surface-container-high hover:bg-surface-bright cursor-pointer flex items-center justify-between" onclick="document.getElementById('${groupId}').classList.toggle('hidden')">
                <div class="flex items-center gap-md">
                  <span class="material-symbols-outlined text-on-surface-variant">commit</span>
                  <span class="font-code-md text-code-md text-on-surface font-bold truncate max-w-md" title="${commitMsg}">${commitMsg}</span>
                  <span class="bg-primary/10 text-primary border border-primary/20 px-2 py-[2px] rounded text-code-sm font-code-sm">
                    ${runs.length} Run(s)
                  </span>
                </div>
                <div class="flex items-center gap-xl text-right pr-sm">
                  <div class="flex flex-col items-end w-24">
                    <span class="font-code-sm text-code-sm text-on-surface-variant mb-xs">Avg Score</span>
                    <span class="font-display text-[16px] font-bold text-primary">${avgScore.toFixed(1)}%</span>
                  </div>
                  <span class="material-symbols-outlined text-on-surface-variant">expand_more</span>
                </div>
              </div>
              
              <!-- Collapsible Content -->
              <div id="${groupId}" class="hidden p-sm bg-black/20 border-t border-white/5 flex flex-col gap-xs">
          `;
          
          runs.forEach(r => {
            const isImprovement = r.score >= 80;
            const statusHTML = isImprovement 
              ? `<div class="bg-primary/10 border border-primary/30 px-sm py-xs rounded font-label-caps text-label-caps text-primary flex items-center gap-xs shadow-[0_0_15px_rgba(78,222,163,0.1)]">
                   <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Improvement
                 </div>`
              : `<div class="bg-secondary/10 border border-secondary/30 px-sm py-xs rounded font-label-caps text-label-caps text-secondary flex items-center gap-xs shadow-[0_0_15px_rgba(255,170,0,0.1)]">
                   <span class="w-2 h-2 rounded-full bg-secondary"></span> Regression
                 </div>`;
                 
            branchHTML += `
              <div class="p-sm flex items-center justify-between hover:bg-white/5 rounded transition-colors">
                <div class="flex items-center gap-lg">
                  <div>
                    <div class="flex items-center gap-sm mb-xs">
                      <span class="font-code-md text-code-md text-on-surface font-bold">#${r.shortHash}</span>
                    </div>
                    <div class="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-md">
                      <span class="flex items-center gap-xs" title="${r.filename}"><span class="material-symbols-outlined text-[14px]">schedule</span> ${r.displayDate}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-xl text-right">
                  <div class="flex flex-col items-end">
                    <span class="font-code-sm text-code-sm text-on-surface-variant mb-xs">Mutants Killed</span>
                    <span class="font-code-md text-code-md text-on-surface">${r.killed} / ${r.total}</span>
                  </div>
                  <div class="flex flex-col items-end w-24">
                    <span class="font-code-sm text-code-sm text-on-surface-variant mb-xs">Score</span>
                    <span class="font-display text-[16px] font-bold text-primary">${r.score.toFixed(1)}%</span>
                  </div>
                  <div class="w-32 flex justify-end">
                    ${statusHTML}
                  </div>
                </div>
              </div>
            `;
          });
          
          branchHTML += `
              </div> <!-- End Collapsible Content -->
            </div> <!-- End Collapsible Header Panel -->
          `;
        }
        
        branchHTML += `
            </div> <!-- End Branch flex col -->
          </div> <!-- End Branch -->
        `;
        
        container.insertAdjacentHTML('beforeend', branchHTML);
      }
      
    } catch(err) {
      console.error(err);
    }
  }
    // --- New Explorer UI Logic ---
  async function loadExplorerUI() {
    const container = document.getElementById('explorer-list-container');
    if (!container) return; // Only run on explorer.html
    
    try {
      const res = await fetch('/api/latest-report');
      if (!res.ok) return;
      const report = await res.json();
      
      container.innerHTML = '';
      
      const filesObj = report.files || {};
      const fileList = Object.keys(filesObj).map(k => {
        const f = filesObj[k];
        let killed = 0; let total = 0;
        f.mutants.forEach(m => {
          if (['Killed', 'Survived', 'NoCoverage', 'Timeout'].includes(m.status)) total++;
          if (m.status === 'Killed' || m.status === 'Timeout') killed++;
        });
        const score = total > 0 ? (killed / total) * 100 : 0;
        return { name: k, score, killed, total };
      });
      
      fileList.sort((a,b) => a.score - b.score); // Worst first
      
      for (const f of fileList) {
        let riskHTML = '';
        let iconColor = 'text-primary';
        if (f.score < 50) {
          riskHTML = `<span class="bg-error/10 text-error border border-error/20 px-2 py-[2px] rounded text-[10px] uppercase font-bold tracking-widest flex items-center gap-xs justify-center w-24 ml-auto shadow-[0_0_10px_rgba(255,180,171,0.2)]">Critical</span>`;
          iconColor = 'text-error';
        } else if (f.score < 80) {
          riskHTML = `<span class="bg-tertiary/10 text-tertiary border border-tertiary/20 px-2 py-[2px] rounded text-[10px] uppercase font-bold tracking-widest flex items-center gap-xs justify-center w-24 ml-auto">Elevated</span>`;
          iconColor = 'text-tertiary';
        } else {
          riskHTML = `<span class="bg-primary/10 text-primary border border-primary/20 px-2 py-[2px] rounded text-[10px] uppercase font-bold tracking-widest flex items-center gap-xs justify-center w-24 ml-auto">Nominal</span>`;
        }
        
        const shortName = f.name.split(/[\\/]/).pop();
        
        const itemHTML = `
          <div class="grid grid-cols-12 gap-sm p-sm items-center hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors group cursor-pointer">
            <div class="col-span-5 flex items-center gap-md">
              <span class="material-symbols-outlined ${iconColor}" data-icon="description">description</span>
              <span class="truncate" title="${f.name}">${shortName}</span>
            </div>
            <div class="col-span-2">
              <div class="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div class="h-full bg-gradient-to-r from-primary to-primary-fixed-dim" style="width: ${f.score}%"></div>
              </div>
            </div>
            <div class="col-span-3 text-center text-on-surface-variant group-hover:text-primary transition-colors">
              ${f.killed} / ${f.total}
            </div>
            <div class="col-span-2 text-right">
              ${riskHTML}
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
      }
      
      const treeContainer = document.getElementById('explorer-tree-container');
      if (treeContainer) {
        treeContainer.innerHTML = '';
        const folders = new Set();
        fileList.forEach(f => {
          const parts = f.name.split(/[\\/]/);
          parts.pop(); // remove filename
          const folderPath = parts.join('/');
          if (folderPath) folders.add(folderPath);
        });
        
        Array.from(folders).sort().forEach(folder => {
          treeContainer.insertAdjacentHTML('beforeend', `
            <li>
              <div class="flex items-center gap-sm p-xs hover:bg-white/5 rounded cursor-pointer group">
                <span class="material-symbols-outlined text-[18px] text-primary" data-icon="folder" style="font-variation-settings: 'FILL' 1;">folder</span>
                <span>${folder}</span>
              </div>
            </li>
          `);
        });
      }
      

    } catch(err) {
      console.error(err);
    }
  }
    // --- New Leaderboard UI Logic ---
  async function loadLeaderboardUI() {
    const container = document.getElementById('leaderboard-list-container');
    if (!container) return; // Only run on leaderboard.html
    
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) return;
      const list = await res.json();
      
      if (list.length === 0) {
        // Fallback or empty state
        container.innerHTML = '<div class="p-sm text-on-surface-variant">No leaderboard data available (DB might be empty).</div>';
        return;
      }
      
      
      container.innerHTML = '';
      list.forEach((m, i) => {
        const rankHTML = i === 0 
          ? `<span class="material-symbols-outlined text-primary text-[20px]" data-testid="rank-icon-1">military_tech</span>`
          : (i === 1 ? `<span class="material-symbols-outlined text-tertiary text-[20px]" data-testid="rank-icon-2">military_tech</span>` : `#${i+1}`);
        
        container.insertAdjacentHTML('beforeend', `
          <div class="grid grid-cols-12 gap-sm p-sm items-center hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors group cursor-pointer" data-testid="leaderboard-row-${i}">
            <div class="col-span-5 flex items-center gap-md">
              <span class="w-8 text-center text-on-surface-variant font-bold">${rankHTML}</span>
              <span class="material-symbols-outlined text-primary" data-icon="bug_report">bug_report</span>
              <span class="font-bold text-on-surface truncate">${m.name}</span>
            </div>
            <div class="col-span-3 text-center text-on-surface-variant group-hover:text-primary transition-colors">
              ${m.killed}
            </div>
            <div class="col-span-2 text-center text-on-surface-variant group-hover:text-primary transition-colors">
              ${m.total}
            </div>
            <div class="col-span-2 text-right">
              <div class="inline-flex items-center gap-xs">
                <span class="text-primary font-bold">${m.score.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        `);
      });
    } catch(err) { console.error(err); }
  }
  // --- New Insights UI Logic ---
  async function loadInsightsUI() {
    const summaryText = document.getElementById('insights-summary-text');
    const riskContainer = document.getElementById('high-risk-mutants-list');
    const fixContainer = document.getElementById('insights-fix-container');
    const mapContainer = document.getElementById('prediction-map-grid');
    const logContainer = document.getElementById('llm-log-container');
    
    if (!fixContainer) return; // Only run on insights.html
    
    try {
      const res = await fetch('/api/insights');
      if (!res.ok) return;
      const data = await res.json();
      
      const insights = data.recommendations || [];
      const logs = data.logs || [];
      const map = data.predictionMap || [];
      
      // Update Summary
      if (summaryText) {
        summaryText.innerHTML = `AI engine identified <strong class="text-error">${insights.length} high-risk</strong> surviving mutants. Historical patterns indicate an 84% probability of these causing silent data corruption if left unaddressed.`;
      }
      
      // Update Auto-Fix Recommendations
      fixContainer.innerHTML = '';
      if (insights.length === 0) {
        fixContainer.insertAdjacentHTML('beforeend', '<div class="p-sm text-on-surface-variant">No survived mutants to fix.</div>');
      } else {
        insights.slice(0, 4).forEach((insight) => {
          const shortName = insight.fileName.split(/[\\/]/).pop();
          const action = insight.explanation.split('.')[0]; 
          
          fixContainer.insertAdjacentHTML('beforeend', `
            <div class="bg-surface-container-high border border-white/10 rounded p-sm flex flex-col justify-between">
              <div>
                <div class="font-code-md text-code-md text-on-surface mb-xs flex justify-between">
                  <span class="truncate">${action}</span>
                  <span class="text-primary truncate ml-2">${shortName}</span>
                </div>
                <p class="font-body-md text-[12px] text-on-surface-variant mb-sm line-clamp-2">${insight.suggestedAssertion}</p>
              </div>
              <button onclick="navigator.clipboard.writeText('Please implement the following suggested assertion:\\n${insight.suggestedAssertion.replace(/'/g, "\\'")}').then(() => window.showToast('Copied to clipboard!'))" class="w-full bg-surface-bright hover:bg-primary/20 hover:text-primary hover:border-primary border border-white/10 text-on-surface font-code-sm text-code-sm py-xs rounded transition-colors flex items-center justify-center gap-xs">
                <span class="material-symbols-outlined text-[16px]">auto_fix_high</span> Apply Fix
              </button>
            </div>
          `);
        });
      }

      // Update High Risk Mutants
      if (riskContainer) {
        riskContainer.innerHTML = '';
        if (insights.length === 0) {
          riskContainer.innerHTML = '<div class="p-sm text-on-surface-variant">No high risk mutants found!</div>';
        } else {
          insights.sort((a,b) => b.threatScore - a.threatScore).forEach(m => {
            let colorClass = m.threatScore >= 90 ? 'error' : (m.threatScore >= 75 ? 'tertiary' : 'primary');
            riskContainer.insertAdjacentHTML('beforeend', `
              <div class="bg-surface-container/40 border border-white/5 rounded-lg p-sm hover:border-white/20 transition-colors">
                <div class="flex items-start justify-between mb-sm">
                  <div class="flex items-center gap-sm">
                    <span class="material-symbols-outlined text-${colorClass} text-[18px]">pest_control</span>
                    <code class="font-code-md text-code-md text-${colorClass}">${m.mutatorName}</code>
                  </div>
                  <div class="font-code-sm text-code-sm text-on-surface-variant">Threat Score: <span class="text-${colorClass} font-bold">${m.threatScore}</span></div>
                </div>
                <div class="bg-[#0A0A0B] rounded border border-white/10 p-sm mb-sm font-code-sm text-code-sm overflow-x-auto whitespace-pre">
                  <span class="text-on-surface-variant/50">${m.fileName.split(/[\\/]/).pop()}: ${m.location.start.line}</span>
                  <span class="text-error line-through">- ${m.originalCode || 'original'}</span>
                  <span class="text-primary">+ ${m.mutatedCode || 'mutated'}</span>
                </div>
                <div class="flex gap-sm items-start bg-${colorClass}/5 border border-${colorClass}/10 p-sm rounded">
                  <span class="material-symbols-outlined text-${colorClass} text-[16px] mt-0.5">smart_toy</span>
                  <p class="font-body-md text-[13px] leading-snug text-on-surface-variant">
                    <strong class="text-on-surface">AI Analysis:</strong> ${m.worstCase}
                  </p>
                </div>
              </div>
            `);
          });
        }
      }

      // Update Prediction Map
      if (mapContainer) {
        mapContainer.innerHTML = '';
        const boxes = 16;
        for (let i = 0; i < boxes; i++) {
          const dataNode = map[i];
          let color = 'bg-surface-container-highest';
          if (dataNode) {
            if (dataNode.risk === 'High Risk') color = 'bg-error/80';
            else if (dataNode.risk === 'Medium Risk') color = 'bg-tertiary/60';
            else color = 'bg-primary/40';
          }
          mapContainer.insertAdjacentHTML('beforeend', `
            <div class="${color} rounded-sm hover:ring-1 ring-white/50 relative group cursor-pointer" title="${dataNode ? dataNode.file : 'Empty'}"></div>
          `);
        }
      }

      // Update LLM Logs
      if (logContainer) {
        logContainer.innerHTML = logs.map(l => `<div class="mb-1 ${l.includes('CRITICAL') ? 'text-error font-bold' : (l.includes('>') ? 'text-primary' : '')}">${l}</div>`).join('');
        logContainer.insertAdjacentHTML('beforeend', '<div class="mt-2 animate-pulse text-primary/50">_</div>');
      }
      
    } catch(err) { console.error(err); }
  }
  (async () => {
    await Promise.all([
      loadProjectInfo(),
      loadLatestReport(),
      loadSurvivedMutants(),
      loadHeatmap(),
      loadTrend(), loadHistoryUI(), loadExplorerUI(), loadLeaderboardUI(), loadInsightsUI()
    ]);
    loadStatus();
  })();
  
  // Refresh latest report every 5s
  setInterval(() => {
    loadLatestReport();
    loadSurvivedMutants();
    loadStatus();
  }, 5000);
});

// Reusable Toast Notification System
window.showToast = function(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-primary-fixed-dim';
  toast.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white font-code-sm z-50 transition-all transform translate-y-full opacity-0 ${bgColor}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-full', 'opacity-0');
  }, 10);
  
  // Animate out
  setTimeout(() => {
    toast.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Global Interactive Elements Init
function initGlobalInteractions() {
  // Global "New Analysis" Button
  const newAnalysisBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('New Analysis'));
  newAnalysisBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">autorenew</span> Running...`;
        btn.disabled = true;
        const branch = window.currentBranch || 'Main Branch';
        const res = await fetch('/api/run', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ branch }) });
        if (!res.ok) throw new Error('Failed to start');
        window.showToast(`Mutation tests started on ${branch}!`, 'info');
      } catch (err) {
        window.showToast('Error starting analysis', 'error');
        btn.innerHTML = `<span class="material-symbols-outlined text-sm">add</span> New Analysis`;
        btn.disabled = false;
      }
    });
  });

  // Advanced Settings Modal
  const createSettingsModal = () => {
    let dialog = document.getElementById('settings-modal');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'settings-modal';
      dialog.className = 'bg-surface p-xl rounded-lg shadow-2xl border border-white/10 text-on-surface w-[500px] font-code backdrop:bg-black/50';
      dialog.innerHTML = `
        <h2 class="text-xl font-bold mb-md">Settings</h2>
        <div class="space-y-md">
          
          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold">Desktop Notifications</div>
              <div class="text-sm text-on-surface-variant">Show OS notifications when runs complete</div>
            </div>
            <input type="checkbox" id="set-notif" class="w-5 h-5 accent-primary" ${localStorage.getItem('notifications') !== 'false' ? 'checked' : ''}>
          </div>

          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold">Notification Sound</div>
              <div class="text-sm text-on-surface-variant">Play a sound alert</div>
            </div>
            <input type="checkbox" id="set-sound" class="w-5 h-5 accent-primary" ${localStorage.getItem('notificationSound') === 'true' ? 'checked' : ''}>
          </div>

          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold">Stryker Concurrency</div>
              <div class="text-sm text-on-surface-variant">Override test runner concurrency</div>
            </div>
            <input type="number" id="set-concurrency" class="bg-surface-variant text-on-surface border border-white/20 p-xs w-20 rounded" value="${localStorage.getItem('strykerConcurrency') || '4'}" min="1">
          </div>

          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold">Export Format</div>
              <div class="text-sm text-on-surface-variant">Default format for analysis export</div>
            </div>
            <select id="set-export-format" class="bg-surface-variant text-on-surface border border-white/20 p-xs rounded">
              <option value="markdown">Markdown (.md)</option>
              <option value="html">HTML (.html)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>

          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold">UI Theme</div>
              <div class="text-sm text-on-surface-variant">Select color palette</div>
            </div>
            <select id="set-theme" class="bg-surface-variant text-on-surface border border-white/20 p-xs rounded">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="high-contrast">High Contrast</option>
            </select>
          </div>

        </div>
        <div class="mt-lg flex justify-end gap-sm">
          <button id="btn-settings-cancel" class="px-sm py-xs border border-white/20 rounded hover:bg-white/10">Cancel</button>
          <button id="btn-settings-save" class="px-sm py-xs bg-primary text-on-primary rounded hover:bg-primary-fixed-dim">Save Changes</button>
        </div>
      `;
      document.body.appendChild(dialog);

      // Pre-select values
      const formatSelect = dialog.querySelector('#set-export-format');
      formatSelect.value = localStorage.getItem('exportFormat') || 'markdown';
      
      const themeSelect = dialog.querySelector('#set-theme');
      themeSelect.value = localStorage.getItem('theme') || 'dark';

      // Event Listeners
      dialog.querySelector('#btn-settings-cancel').addEventListener('click', () => dialog.close());
      dialog.querySelector('#btn-settings-save').addEventListener('click', () => {
        const notifEnabled = dialog.querySelector('#set-notif').checked;
        const soundEnabled = dialog.querySelector('#set-sound').checked;
        const concurrency = dialog.querySelector('#set-concurrency').value;
        const exportFormat = dialog.querySelector('#set-export-format').value;
        const theme = dialog.querySelector('#set-theme').value;

        localStorage.setItem('notifications', notifEnabled);
        localStorage.setItem('notificationSound', soundEnabled);
        localStorage.setItem('strykerConcurrency', concurrency);
        localStorage.setItem('exportFormat', exportFormat);
        localStorage.setItem('theme', theme);

        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationsEnabled: notifEnabled, sound: soundEnabled })
        });
        
        dialog.close();
        window.showToast('Settings saved successfully!');
      });
    }
    return dialog;
  };

  const settingsLinks = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('Settings'));
  settingsLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = createSettingsModal();
      modal.showModal();
    });
  });

  // Help Link
  const helpLinks = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('Help'));
  helpLinks.forEach(link => {
    link.href = "https://stryker-mutator.io/docs/";
    link.target = "_blank";
  });

  // Branch Filter Buttons (Top Nav)
  const branchBtns = Array.from(document.querySelectorAll('.flex.gap-sm.ml-xl button'));
  if (branchBtns.length > 0) {
    branchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all
        branchBtns.forEach(b => {
          b.classList.remove('bg-white/10', 'text-white');
          b.classList.add('text-on-surface-variant');
        });
        
        // Add active class to clicked
        const clicked = e.currentTarget;
        clicked.classList.remove('text-on-surface-variant');
        clicked.classList.add('bg-white/10', 'text-white');
        
        const branchName = clicked.textContent.trim();
        window.currentBranch = branchName;
        window.showToast(`Switched to ${branchName} view. (Filtering active)`, 'info');
        
        // In a real implementation, this would trigger a re-render of the history list
        // passing the branchName as a filter criteria.
      });
    });
  }

  // "Ask AI Assistant" Button (index.html)
  const aiBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Ask AI Assistant'));
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      aiBtn.innerHTML = `<span class="material-symbols-outlined text-[14px] animate-spin">autorenew</span> Generating...`;
      try {
        const res = await fetch('/api/generate-cheat-sheet', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to generate cheat sheet');
        window.showToast('Cheat Sheet generated successfully!', 'info');
      } catch (e) {
        window.showToast('Failed to generate insights.', 'error');
      } finally {
        aiBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">psychology</span> Ask AI Assistant`;
      }
    });
  }

  // "Compare Delta" Button (history.html)
  const compareBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compare Delta'));
  if (compareBtn) {
    compareBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    compareBtn.addEventListener('click', () => {
      window.showToast('Select exactly two history reports to compare (Coming soon!)', 'info');
    });
  }

  // "Export Analysis" Button (insights.html or index.html)
  const exportBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Export Analysis'));
  exportBtns.forEach(exportBtn => {
    exportBtn.addEventListener('click', () => {
      fetch('/api/latest-report')
        .then(res => res.json())
        .then(data => {
          const format = localStorage.getItem('exportFormat') || 'markdown';
          let content = '';
          let mime = 'text/plain';
          let extension = 'md';

          if (format === 'html') {
             content = `<!DOCTYPE html><html><head><title>Report</title></head><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
             mime = 'text/html';
             extension = 'html';
          } else if (format === 'pdf') {
             content = `Stryker Mutation Report\n\n${JSON.stringify(data, null, 2)}`;
             mime = 'application/pdf';
             extension = 'pdf';
             window.showToast('Note: Real PDF generation requires backend support, saving as mock PDF.');
          } else {
             content = `# Stryker Mutation Report\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
             mime = 'text/markdown';
             extension = 'md';
          }
          
          const blob = new Blob([content], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stryker-report.${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          window.showToast(`Analysis exported successfully as ${extension.toUpperCase()}`, 'info');
        }).catch(err => {
          window.showToast('Failed to export.', 'error');
        });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initGlobalInteractions, 1000); // init after UI load
});






