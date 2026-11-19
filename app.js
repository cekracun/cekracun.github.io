(() => {
  const PRODUCTS = Array.isArray(window.CEKRACUN_PRODUCTS) ? window.CEKRACUN_PRODUCTS : [];

  const CAT_LABELS = {
    all: "Semua Kategori",
    kos: "Kamar Kos",
    desk: "Desk & Gadget",
    dapur: "Dapur & Minum",
    skincare: "Skincare & Wangi",
    gaya: "Gaya & Harian",
  };

  const FALLBACK_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#EFECE4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#636159">CekRacun</text></svg>'
    );

  const fmtRp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

  function attachImgFallback(imgEl) {
    imgEl.addEventListener("error", () => {
      if (imgEl.dataset.fallbackApplied) return;
      imgEl.dataset.fallbackApplied = "1";
      imgEl.src = FALLBACK_IMG;
    });
  }

  // Stat Pill
  const statPill = document.getElementById("catalog-stat-pill");
  if (statPill) {
    statPill.textContent = `${PRODUCTS.length} produk terverifikasi`;
  }

  // Mode Tab Routing (supports #simulator, #game, #katalog)
  const tabs = [...document.querySelectorAll(".mode-tab")];
  const panels = {
    simulator: document.getElementById("panel-simulator"),
    game: document.getElementById("panel-game"),
    katalog: document.getElementById("panel-katalog"),
  };

  function setMode(mode) {
    if (!panels[mode]) mode = "simulator";
    tabs.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    Object.entries(panels).forEach(([k, el]) => {
      const active = k === mode;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
    if (history.replaceState) {
      history.replaceState(null, "", "#" + mode);
    }
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  const initialHash = location.hash.replace("#", "").toLowerCase();
  if (panels[initialHash]) setMode(initialHash);

  // =========================================================
  // MODE 01: BUDGET SETUP SIMULATOR
  // =========================================================
  const simState = {
    budget: 150000,
    cat: "all",
    maxItemPrice: 0,
    activeTheme: "",
    lockedIds: new Set(),
    bundle: [],
  };

  const simBudgetInput = document.getElementById("sim-budget-input");
  const simBudgetRange = document.getElementById("sim-budget-range");
  const simPresetBtns = [...document.querySelectorAll("#panel-simulator .preset-btn")];
  const simThemePills = [...document.querySelectorAll("#sim-theme-pills .theme-pill")];
  const simCatChips = [...document.querySelectorAll("#sim-cat-chips .chip")];
  const simSpentEl = document.getElementById("sim-spent");
  const simLeftEl = document.getElementById("sim-left");
  const simCountEl = document.getElementById("sim-count");
  const simMeterFill = document.getElementById("sim-meter-fill");
  const simMeterCaption = document.getElementById("sim-meter-caption");
  const simListEl = document.getElementById("sim-list");
  const simRerollBtn = document.getElementById("sim-reroll-btn");
  const simReceiptBtn = document.getElementById("sim-receipt-btn");
  const simCopyBtn = document.getElementById("sim-copy-btn");
  const simCopyFeedback = document.getElementById("sim-copy-feedback");

  const receiptModal = document.getElementById("receipt-modal");
  const receiptMetaEl = document.getElementById("receipt-meta");
  const receiptItemsEl = document.getElementById("receipt-items");
  const receiptTotalEl = document.getElementById("receipt-total");
  const receiptLeftEl = document.getElementById("receipt-left");
  const receiptCopyBtn = document.getElementById("receipt-copy-btn");
  const receiptCloseBtn = document.getElementById("receipt-close-btn");

  function itemQualityScore(item) {
    const soldBoost = Math.log10(Math.max(item.s, 10) + 1);
    const ratingBoost = item.r ? item.r : 4.5;
    return ratingBoost * 1.4 + soldBoost + Math.random() * 1.8;
  }

  function buildBundle(reroll = true) {
    const lockedItems = simState.bundle.filter((x) => simState.lockedIds.has(x.id));
    let spent = lockedItems.reduce((acc, x) => acc + x.p, 0);
    const chosen = [...lockedItems];
    const usedIds = new Set(chosen.map((x) => x.id));

    if (!reroll && chosen.length > 0 && spent <= simState.budget) {
      // Keep current items that still fit if budget shrunk
    }

    const itemCap = simState.maxItemPrice > 0 ? Math.min(simState.maxItemPrice, simState.budget) : simState.budget;
    const pool = PRODUCTS.filter(
      (x) =>
        (simState.cat === "all" || x.c === simState.cat) &&
        !usedIds.has(x.id) &&
        x.p <= itemCap
    );

    const ranked = pool
      .map((item) => ({ item, score: itemQualityScore(item) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    const maxItems = simState.budget >= 350000 ? 8 : 6;
    for (const item of ranked) {
      if (chosen.length >= maxItems) break;
      if (spent + item.p <= simState.budget) {
        chosen.push(item);
        usedIds.add(item.id);
        spent += item.p;
      }
    }

    simState.bundle = chosen;
    renderSimulator();
  }

  function renderSimulator() {
    const spent = simState.bundle.reduce((sum, x) => sum + x.p, 0);
    const left = Math.max(0, simState.budget - spent);
    const pct = simState.budget > 0 ? Math.min(100, Math.round((spent / simState.budget) * 100)) : 0;

    simSpentEl.textContent = fmtRp(spent);
    simLeftEl.textContent = fmtRp(left);
    simCountEl.textContent = `${simState.bundle.length} item`;
    simMeterFill.style.width = `${pct}%`;
    simMeterCaption.textContent = `${pct}% dari ${fmtRp(simState.budget)} terpakai`;

    simListEl.innerHTML = "";
    if (simState.bundle.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-box";
      empty.textContent = "Belum ada barang di kategori ini yang harganya masuk batas budget. Naikkan budget atau pilih kategori lain.";
      simListEl.appendChild(empty);
      return;
    }

    simState.bundle.forEach((item) => {
      const isLocked = simState.lockedIds.has(item.id);
      const row = document.createElement("article");
      row.className = "bundle-row" + (isLocked ? " is-locked" : "");

      const img = document.createElement("img");
      img.className = "bundle-thumb";
      img.src = item.i;
      img.alt = item.t;
      img.loading = "lazy";
      attachImgFallback(img);

      const info = document.createElement("div");
      info.className = "bundle-info";

      const badges = document.createElement("div");
      badges.className = "bundle-badges";
      const catBadge = document.createElement("span");
      catBadge.className = "badge";
      catBadge.textContent = CAT_LABELS[item.c] || item.c;
      badges.appendChild(catBadge);

      if (item.p < 20000) {
        const impBadge = document.createElement("span");
        impBadge.className = "badge badge-impulse";
        impBadge.textContent = "⚡ <20rb";
        badges.appendChild(impBadge);
      }
      if (item.st) {
        const soldBadge = document.createElement("span");
        soldBadge.className = "badge badge-sold";
        soldBadge.textContent = item.s >= 10000 ? `🔥 ${item.st} terjual` : `${item.st} terjual`;
        badges.appendChild(soldBadge);
      }
      if (item.r) {
        const rateBadge = document.createElement("span");
        rateBadge.className = "badge";
        rateBadge.textContent = `★ ${item.r.toFixed(1)}`;
        badges.appendChild(rateBadge);
      }

      const title = document.createElement("h3");
      title.className = "bundle-title";
      title.textContent = item.t;

      const price = document.createElement("div");
      price.className = "bundle-price num";
      price.textContent = fmtRp(item.p);

      info.append(badges, title, price);

      const actions = document.createElement("div");
      actions.className = "bundle-actions";

      const miniRow = document.createElement("div");
      miniRow.className = "btn-mini-row";

      const lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "icon-btn" + (isLocked ? " is-locked" : "");
      lockBtn.textContent = isLocked ? "Terkunci" : "Kunci";
      lockBtn.addEventListener("click", () => {
        if (simState.lockedIds.has(item.id)) {
          simState.lockedIds.delete(item.id);
        } else {
          simState.lockedIds.add(item.id);
        }
        renderSimulator();
      });

      const dropBtn = document.createElement("button");
      dropBtn.type = "button";
      dropBtn.className = "icon-btn";
      dropBtn.textContent = "Ganti";
      dropBtn.addEventListener("click", () => {
        simState.lockedIds.delete(item.id);
        simState.bundle = simState.bundle.filter((x) => x.id !== item.id);
        const usedIds = new Set(simState.bundle.map((x) => x.id));
        usedIds.add(item.id);
        const currentSpent = simState.bundle.reduce((s, x) => s + x.p, 0);
        const budgetLeft = simState.budget - currentSpent;
        const itemCap = simState.maxItemPrice > 0 ? Math.min(simState.maxItemPrice, budgetLeft) : budgetLeft;
        const candidate = PRODUCTS.find(
          (x) =>
            (simState.cat === "all" || x.c === simState.cat) &&
            !usedIds.has(x.id) &&
            x.p <= itemCap
        );
        if (candidate) simState.bundle.push(candidate);
        renderSimulator();
      });

      miniRow.append(lockBtn, dropBtn);

      const buyLink = document.createElement("a");
      buyLink.className = "btn-buy-sm";
      buyLink.href = item.u;
      buyLink.target = "_blank";
      buyLink.rel = "noopener noreferrer";
      buyLink.textContent = "Beli di Shopee ↗";

      actions.append(miniRow, buyLink);
      row.append(img, info, actions);
      simListEl.appendChild(row);
    });
  }

  function syncThemePills() {
    simThemePills.forEach((p) => {
      p.classList.toggle("is-active", p.dataset.theme === simState.activeTheme);
    });
  }

  function setBudget(val, keepTheme = false) {
    const clean = Math.max(15000, Math.min(2000000, Number(val) || 150000));
    simState.budget = clean;
    if (!keepTheme) {
      simState.maxItemPrice = 0;
      simState.activeTheme = "";
      syncThemePills();
    }
    simBudgetInput.value = clean;
    simBudgetRange.value = Math.min(1000000, clean);
    simPresetBtns.forEach((b) => {
      b.classList.toggle("is-selected", Number(b.dataset.budget) === clean);
    });
    simState.lockedIds.clear();
    buildBundle(true);
  }

  simBudgetInput.addEventListener("change", (e) => setBudget(e.target.value));
  simBudgetRange.addEventListener("input", (e) => setBudget(e.target.value));
  simPresetBtns.forEach((b) => b.addEventListener("click", () => setBudget(b.dataset.budget)));

  simCatChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      simState.cat = chip.dataset.cat;
      simState.maxItemPrice = 0;
      simState.activeTheme = "";
      syncThemePills();
      simCatChips.forEach((c) => c.classList.toggle("is-active", c === chip));
      simState.lockedIds.clear();
      buildBundle(true);
    });
  });

  simThemePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      simState.cat = pill.dataset.cat;
      simState.maxItemPrice = Number(pill.dataset.max) || 0;
      simState.activeTheme = pill.dataset.theme;
      syncThemePills();
      simCatChips.forEach((c) => c.classList.toggle("is-active", c.dataset.cat === simState.cat));
      setBudget(pill.dataset.budget, true);
    });
  });

  simRerollBtn.addEventListener("click", () => buildBundle(true));

  async function copyCurrentBundle() {
    if (simState.bundle.length === 0) return;
    const total = simState.bundle.reduce((s, x) => s + x.p, 0);
    const deepLink = simState.activeTheme
      ? `https://cekracun.github.io/?theme=${simState.activeTheme}&budget=${simState.budget}`
      : `https://cekracun.github.io/?cat=${simState.cat}&budget=${simState.budget}`;
    const lines = [
      `Racikan Setup Budget ${fmtRp(simState.budget)} (${CAT_LABELS[simState.cat]}):`,
      ...simState.bundle.map((x, idx) => `${idx + 1}. ${x.t} — ${fmtRp(x.p)}\n   ${x.u}`),
      `Total: ${fmtRp(total)} · Buka paket ini: ${deepLink}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      simCopyFeedback.textContent = "Daftar & link berhasil disalin ke clipboard.";
    } catch {
      simCopyFeedback.textContent = "Salin otomatis diblokir browser; silakan cek link langsung.";
    }
    setTimeout(() => {
      simCopyFeedback.textContent = "";
    }, 3000);
  }

  function openReceipt() {
    if (simState.bundle.length === 0) return;
    const total = simState.bundle.reduce((s, x) => s + x.p, 0);
    const left = Math.max(0, simState.budget - total);
    receiptMetaEl.textContent = `${CAT_LABELS[simState.cat].toUpperCase()} · BUDGET ${fmtRp(simState.budget)}`;
    receiptItemsEl.innerHTML = "";
    simState.bundle.forEach((item) => {
      const li = document.createElement("li");
      const line = document.createElement("div");
      line.className = "receipt-line";
      const name = document.createElement("span");
      name.className = "receipt-item-name";
      name.textContent = item.t.length > 46 ? item.t.slice(0, 45) + "…" : item.t;
      const price = document.createElement("span");
      price.className = "receipt-item-price";
      price.textContent = fmtRp(item.p);
      line.append(name, price);
      li.appendChild(line);
      receiptItemsEl.appendChild(li);
    });
    receiptTotalEl.textContent = fmtRp(total);
    receiptLeftEl.textContent = fmtRp(left);
    receiptModal.hidden = false;
  }

  function closeReceipt() {
    receiptModal.hidden = true;
  }

  function drawReceiptCanvas() {
    const W = 1080;
    const items = simState.bundle.slice(0, 10);
    const H = Math.max(1350, 760 + items.length * 74);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Warm paper background + subtle dot grid
    ctx.fillStyle = "#F7F5F0";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(18, 18, 16, 0.08)";
    for (let x = 28; x < W; x += 36) {
      for (let y = 28; y < H; y += 36) {
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // Printer slot bar
    const rx = 110, rw = W - 220, ry = 104, rh = H - 208;
    ctx.fillStyle = "#121210";
    ctx.fillRect(rx - 30, ry - 14, rw + 60, 26);

    // Thermal paper card
    ctx.fillStyle = "#FFFDF8";
    ctx.strokeStyle = "rgba(18, 18, 16, 0.24)";
    ctx.lineWidth = 3;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);

    // Header
    ctx.fillStyle = "#EE4D2D";
    ctx.beginPath();
    ctx.arc(W / 2 - 118, ry + 78, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#121210";
    ctx.font = "800 32px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CEKRACUN", W / 2 + 12, ry + 88);

    ctx.font = "800 44px 'JetBrains Mono', monospace";
    ctx.fillText("STRUK RACIKAN BUDGET", W / 2, ry + 150);

    ctx.fillStyle = "#636159";
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    ctx.fillText(`${CAT_LABELS[simState.cat].toUpperCase()} · BUDGET ${fmtRp(simState.budget)}`, W / 2, ry + 194);

    // Dashed divider
    const drawDash = (y) => {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = "rgba(18, 18, 16, 0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx + 48, y);
      ctx.lineTo(rx + rw - 48, y);
      ctx.stroke();
      ctx.restore();
    };
    drawDash(ry + 230);

    // Line items
    let cy = ry + 292;
    items.forEach((item, idx) => {
      const label = `${idx + 1}. ${item.t.length > 34 ? item.t.slice(0, 33) + "…" : item.t}`;
      ctx.fillStyle = "#121210";
      ctx.font = "700 26px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, rx + 50, cy);
      ctx.font = "800 26px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(fmtRp(item.p), rx + rw - 50, cy);
      cy += 72;
    });

    const total = simState.bundle.reduce((s, x) => s + x.p, 0);
    const left = Math.max(0, simState.budget - total);

    drawDash(cy - 18);
    cy += 44;
    ctx.fillStyle = "#121210";
    ctx.font = "800 36px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL", rx + 50, cy);
    ctx.textAlign = "right";
    ctx.fillText(fmtRp(total), rx + rw - 50, cy);

    // Green stamp box
    const sy = cy + 44;
    ctx.fillStyle = "rgba(17, 122, 75, 0.12)";
    ctx.strokeStyle = "#117A4B";
    ctx.lineWidth = 3;
    ctx.fillRect(rx + 50, sy, rw - 100, 82);
    ctx.strokeRect(rx + 50, sy, rw - 100, 82);
    ctx.fillStyle = "#117A4B";
    ctx.font = "800 28px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SISA BUDGET ${fmtRp(left)} · LOLOS!`, W / 2, sy + 52);

    // Footer URL
    ctx.fillStyle = "#3F3E38";
    ctx.font = "700 24px 'JetBrains Mono', monospace";
    ctx.fillText("cekracun.github.io  ·  923 Produk Shopee Terverifikasi", W / 2, ry + rh - 44);
    return canvas;
  }

  function exportReceiptPng() {
    if (simState.bundle.length === 0) return;
    const canvas = drawReceiptCanvas();
    const fname = `struk-cekracun-${simState.budget}.png`;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  const receiptDownloadBtn = document.getElementById("receipt-download-btn");
  if (receiptDownloadBtn) receiptDownloadBtn.addEventListener("click", exportReceiptPng);

  simCopyBtn.addEventListener("click", copyCurrentBundle);
  receiptCopyBtn.addEventListener("click", copyCurrentBundle);
  simReceiptBtn.addEventListener("click", openReceipt);
  receiptCloseBtn.addEventListener("click", closeReceipt);
  receiptModal.addEventListener("click", (e) => {
    if (e.target === receiptModal) closeReceipt();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !receiptModal.hidden) closeReceipt();
  });

  // =========================================================
  // MODE 02: TEBAK HARGA RACUN SHOPEE
  // =========================================================
  const gameScoreEl = document.getElementById("game-score");
  const gameStreakEl = document.getElementById("game-streak");
  const gameBestEl = document.getElementById("game-best");
  const gameImgEl = document.getElementById("game-img");
  const gameCatEl = document.getElementById("game-cat");
  const gameSoldEl = document.getElementById("game-sold");
  const gameTitleEl = document.getElementById("game-title");
  const gameGuessInput = document.getElementById("game-guess-input");
  const gameGuessRange = document.getElementById("game-guess-range");
  const gameGuessControls = document.getElementById("game-guess-controls");
  const gameRevealBox = document.getElementById("game-reveal-box");
  const gameVerdictEl = document.getElementById("game-verdict");
  const gameYourGuessEl = document.getElementById("game-your-guess");
  const gameRealPriceEl = document.getElementById("game-real-price");
  const gameDiffEl = document.getElementById("game-diff");
  const gameShopeeLink = document.getElementById("game-shopee-link");
  const gameSubmitBtn = document.getElementById("game-submit-btn");
  const gameNextBtn = document.getElementById("game-next-btn");
  const nudgeBtns = [...document.querySelectorAll(".nudge-btn")];

  attachImgFallback(gameImgEl);

  const gameState = {
    score: 0,
    streak: 0,
    best: Number(localStorage.getItem("cekracun_best") || 0),
    current: null,
    seen: new Set(),
  };

  function updateGameStats() {
    gameScoreEl.textContent = String(gameState.score);
    gameStreakEl.textContent = `${gameState.streak}🔥`;
    gameBestEl.textContent = String(gameState.best);
  }

  function pickMysteryItem() {
    const candidates = PRODUCTS.filter((x) => x.p >= 5000 && x.p <= 350000 && !gameState.seen.has(x.id));
    const pool = candidates.length > 0 ? candidates : PRODUCTS;
    const item = pool[Math.floor(Math.random() * pool.length)];
    gameState.current = item;
    gameState.seen.add(item.id);

    gameImgEl.removeAttribute("data-fallback-applied");
    gameImgEl.src = item.i;
    gameImgEl.alt = item.t;
    gameCatEl.textContent = CAT_LABELS[item.c] || item.c;
    gameSoldEl.textContent = item.st ? `Terjual ${item.st}` : "Barang terkurasi";
    gameTitleEl.textContent = item.t;

    const defaultGuess = 35000;
    gameGuessInput.value = defaultGuess;
    gameGuessRange.value = defaultGuess;
    gameGuessControls.hidden = false;
    gameRevealBox.hidden = true;
  }

  function setGuess(val) {
    const clean = Math.max(1000, Math.min(2000000, Number(val) || 1000));
    gameGuessInput.value = clean;
    gameGuessRange.value = Math.min(300000, clean);
  }

  gameGuessInput.addEventListener("change", (e) => setGuess(e.target.value));
  gameGuessRange.addEventListener("input", (e) => setGuess(e.target.value));
  nudgeBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const cur = Number(gameGuessInput.value) || 0;
      setGuess(cur + Number(b.dataset.delta));
    });
  });

  gameSubmitBtn.addEventListener("click", () => {
    const item = gameState.current;
    if (!item) return;
    const guess = Math.max(1000, Number(gameGuessInput.value) || 0);
    const real = item.p;
    const pctDiff = Math.round((Math.abs(guess - real) / real) * 100);

    let verdictText = "";
    let isGood = false;
    if (pctDiff <= 15) {
      gameState.score += 100;
      gameState.streak += 1;
      verdictText = "Insting Tajam! (+100 poin)";
      isGood = true;
    } else if (pctDiff <= 35) {
      gameState.score += 50;
      gameState.streak += 1;
      verdictText = "Hampir Tepat! (+50 poin)";
      isGood = true;
    } else {
      gameState.streak = 0;
      verdictText = guess > real ? "Kemahalan! Aslinya lebih murah." : "Kekecilan! Aslinya lebih mahal.";
    }

    if (gameState.score > gameState.best) {
      gameState.best = gameState.score;
      localStorage.setItem("cekracun_best", String(gameState.best));
    }

    updateGameStats();
    gameVerdictEl.textContent = verdictText;
    gameVerdictEl.className = "reveal-verdict " + (isGood ? "is-good" : "is-warn");
    gameYourGuessEl.textContent = fmtRp(guess);
    gameRealPriceEl.textContent = fmtRp(real);
    gameDiffEl.textContent = `${pctDiff}%`;
    gameShopeeLink.href = item.u;

    gameGuessControls.hidden = true;
    gameRevealBox.hidden = false;
  });

  gameNextBtn.addEventListener("click", pickMysteryItem);

  // =========================================================
  // MODE 03: KATALOG & FILTER (HIGH-INTENT BUYER DIRECTORY)
  // =========================================================
  const catState = {
    query: "",
    cat: "all",
    maxPrice: 0,
    sort: "sold",
    limit: 24,
  };

  const catSearchInput = document.getElementById("cat-search");
  const catSortSelect = document.getElementById("cat-sort");
  const catFilterChips = [...document.querySelectorAll("#cat-filter-chips .chip")];
  const priceFilterChips = [...document.querySelectorAll("#price-filter-chips .chip")];
  const catCountLabel = document.getElementById("cat-count-label");
  const catGridEl = document.getElementById("cat-grid");
  const catLoadMoreBtn = document.getElementById("cat-load-more");

  function renderCatalog() {
    const q = catState.query.trim().toLowerCase();
    let list = PRODUCTS.filter((x) => {
      if (catState.cat !== "all" && x.c !== catState.cat) return false;
      if (catState.maxPrice > 0 && x.p > catState.maxPrice) return false;
      if (q && !x.t.toLowerCase().includes(q)) return false;
      return true;
    });

    if (catState.sort === "price-asc") {
      list = [...list].sort((a, b) => a.p - b.p);
    } else if (catState.sort === "price-desc") {
      list = [...list].sort((a, b) => b.p - a.p);
    } else if (catState.sort === "rating") {
      list = [...list].sort((a, b) => (b.r || 0) - (a.r || 0) || b.s - a.s);
    } else {
      list = [...list].sort((a, b) => b.s - a.s);
    }

    const visible = list.slice(0, catState.limit);
    catCountLabel.textContent = `Menampilkan ${visible.length} dari ${list.length} produk`;

    catGridEl.innerHTML = "";
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-box";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = "Tidak ada barang yang cocok dengan filter ini. Coba hapus kata kunci atau naikkan batas harga.";
      catGridEl.appendChild(empty);
      catLoadMoreBtn.hidden = true;
      return;
    }

    visible.forEach((item) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "product-thumb-wrap";

      const img = document.createElement("img");
      img.src = item.i;
      img.alt = item.t;
      img.loading = "lazy";
      attachImgFallback(img);

      const tag = document.createElement("span");
      tag.className = "product-cat-tag";
      tag.textContent = CAT_LABELS[item.c] || item.c;

      thumbWrap.append(img, tag);
      if (item.p < 20000) {
        const impTag = document.createElement("span");
        impTag.className = "product-impulse-tag";
        impTag.textContent = "⚡ <20rb";
        thumbWrap.appendChild(impTag);
      } else if (item.s >= 10000) {
        const impTag = document.createElement("span");
        impTag.className = "product-impulse-tag";
        impTag.textContent = "🔥 Laris";
        thumbWrap.appendChild(impTag);
      }

      const body = document.createElement("div");
      body.className = "product-body";

      const title = document.createElement("h3");
      title.className = "product-title";
      title.textContent = item.t;

      const metaRow = document.createElement("div");
      metaRow.className = "product-meta-row";

      const price = document.createElement("span");
      price.className = "product-price num";
      price.textContent = fmtRp(item.p);

      const sold = document.createElement("span");
      sold.className = "product-sold num";
      sold.textContent = item.st ? `${item.st} terjual` : item.r ? `★ ${item.r.toFixed(1)}` : "";

      metaRow.append(price, sold);

      const cta = document.createElement("a");
      cta.className = "btn-buy-sm";
      cta.href = item.u;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      cta.textContent = "Cek di Shopee ↗";

      body.append(title, metaRow, cta);
      card.append(thumbWrap, body);
      catGridEl.appendChild(card);
    });

    catLoadMoreBtn.hidden = visible.length >= list.length;
  }

  let searchTimer = null;
  catSearchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      catState.query = e.target.value;
      catState.limit = 24;
      renderCatalog();
    }, 150);
  });

  catSortSelect.addEventListener("change", (e) => {
    catState.sort = e.target.value;
    catState.limit = 24;
    renderCatalog();
  });

  catFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      catState.cat = chip.dataset.cat;
      catState.limit = 24;
      catFilterChips.forEach((c) => c.classList.toggle("is-active", c === chip));
      renderCatalog();
    });
  });

  priceFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      catState.maxPrice = Number(chip.dataset.max);
      catState.limit = 24;
      priceFilterChips.forEach((c) => c.classList.toggle("is-active", c === chip));
      renderCatalog();
    });
  });

  catLoadMoreBtn.addEventListener("click", () => {
    catState.limit += 24;
    renderCatalog();
  });

  // =========================================================
  // DEEP-LINK QUERY PARAMS & ATTRIBUTION (?theme, ?cat, ?budget, ?q, ?mode, ?ref)
  // =========================================================
  function applyDeepLinkAndAttribution() {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || "").trim().toLowerCase().slice(0, 48);
    if (ref) {
      sessionStorage.setItem("cekracun_ref", ref);
      try {
        const stats = JSON.parse(localStorage.getItem("cekracun_attr_v1") || "{}");
        stats[ref] = stats[ref] || { visits: 0, clicks: 0 };
        stats[ref].visits += 1;
        localStorage.setItem("cekracun_attr_v1", JSON.stringify(stats));
      } catch {}
    }

    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest('a[href*="shopee"]');
      if (!a) return;
      const activeRef = sessionStorage.getItem("cekracun_ref") || "direct";
      try {
        const stats = JSON.parse(localStorage.getItem("cekracun_attr_v1") || "{}");
        stats[activeRef] = stats[activeRef] || { visits: 0, clicks: 0 };
        stats[activeRef].clicks += 1;
        localStorage.setItem("cekracun_attr_v1", JSON.stringify(stats));
      } catch {}
    });

    window.__cekracunStats = () => {
      try {
        return JSON.parse(localStorage.getItem("cekracun_attr_v1") || "{}");
      } catch {
        return {};
      }
    };

    const q = (params.get("q") || "").trim();
    const mode = (params.get("mode") || "").trim().toLowerCase();
    const theme = (params.get("theme") || "").trim().toLowerCase();
    const cat = (params.get("cat") || "").trim().toLowerCase();
    const budget = Number(params.get("budget") || 0);

    if (theme) {
      const pill = simThemePills.find((p) => p.dataset.theme === theme);
      if (pill) {
        pill.click();
        if (budget >= 15000) setBudget(budget, true);
      }
    } else if (cat || budget >= 15000) {
      if (cat && CAT_LABELS[cat]) {
        simState.cat = cat;
        simCatChips.forEach((c) => c.classList.toggle("is-active", c.dataset.cat === cat));
      }
      if (budget >= 15000) setBudget(budget, false);
      else buildBundle(true);
    }

    if (q) {
      catState.query = q;
      catSearchInput.value = q;
      catState.limit = 24;
      renderCatalog();
      const tabKat = document.getElementById("tab-katalog");
      if (tabKat) tabKat.click();
    } else if (mode === "game" || mode === "katalog" || mode === "simulator") {
      const targetTab = document.getElementById(`tab-${mode}`);
      if (targetTab) targetTab.click();
    }
  }

  // Boot all 3 panels
  buildBundle(true);
  updateGameStats();
  pickMysteryItem();
  renderCatalog();
  applyDeepLinkAndAttribution();
})();
