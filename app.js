let appData = null;
let brokerConfig = null;

const fallbackData = {
  asOf: "2026-05-25",
  source: "fallback sample",
  note: "로컬 데이터를 불러오지 못해 샘플을 표시합니다.",
  disclaimer: "예시 데이터입니다. 실제 투자 판단 전 최신 데이터를 확인하세요.",
  marketSummary: {
    kospi: { value: 0, change: 0 },
    kosdaq: { value: 0, change: 0 },
    usdKrw: { value: 0, change: 0 },
  },
  issues: ["데이터 API 연결 상태를 확인하세요.", "자동 주문 기능은 비활성 상태입니다.", "투자 판단 전 증권사 화면에서 최종 확인하세요."],
  markets: {
    kospi: { label: "코스피", stocks: [] },
    kosdaq: { label: "코스닥", stocks: [] },
  },
};

const appState = {
  currentView: "today",
  selectedMarket: "kospi",
  selectedStockCode: "",
  approval: null,
  selectedBroker: "kis",
};

const selectors = {
  todayTopList: document.querySelector("#todayTopList"),
  recommendationList: document.querySelector("#recommendationList"),
  issueList: document.querySelector("#issueList"),
  pendingCount: document.querySelector("#pendingCount"),
  approvalDrawer: document.querySelector("#approvalDrawer"),
  approvalTitle: document.querySelector("#approvalTitle"),
  approvalBody: document.querySelector("#approvalBody"),
  chartTitle: document.querySelector("#chartTitle"),
  chartCode: document.querySelector("#chartCode"),
  chartPrice: document.querySelector("#chartPrice"),
  chartChange: document.querySelector("#chartChange"),
  chartMetrics: document.querySelector("#chartMetrics"),
  chartBox: document.querySelector("#chartBox"),
  chartDays: document.querySelector("#chartDays"),
  chartReason: document.querySelector("#chartReason"),
  dataStamp: document.querySelector("#dataStamp"),
  kospiValue: document.querySelector("#kospiValue"),
  kospiChange: document.querySelector("#kospiChange"),
  kosdaqValue: document.querySelector("#kosdaqValue"),
  kosdaqChange: document.querySelector("#kosdaqChange"),
  usdKrwValue: document.querySelector("#usdKrwValue"),
  usdKrwChange: document.querySelector("#usdKrwChange"),
  accountTitle: document.querySelector("#accountTitle"),
  accountStatus: document.querySelector("#accountStatus"),
  accountMetrics: document.querySelector("#accountMetrics"),
  holdingCount: document.querySelector("#holdingCount"),
  holdingList: document.querySelector("#holdingList"),
  refreshAccount: document.querySelector("#refreshAccount"),
  brokerTabs: document.querySelector("#brokerTabs"),
  brokerForm: document.querySelector("#brokerForm"),
  brokerProvider: document.querySelector("#brokerProvider"),
  brokerEnabled: document.querySelector("#brokerEnabled"),
  brokerVirtual: document.querySelector("#brokerVirtual"),
  brokerAppKey: document.querySelector("#brokerAppKey"),
  brokerAppSecret: document.querySelector("#brokerAppSecret"),
  brokerAccountNo: document.querySelector("#brokerAccountNo"),
  brokerProductCode: document.querySelector("#brokerProductCode"),
  brokerFormNote: document.querySelector("#brokerFormNote"),
  saveBrokerConfig: document.querySelector("#saveBrokerConfig"),
};

function normalizeData(data) {
  return {
    ...fallbackData,
    ...data,
    marketSummary: {
      ...fallbackData.marketSummary,
      ...(data.marketSummary || {}),
    },
    issues: data.issues && data.issues.length ? data.issues : fallbackData.issues,
    markets: {
      ...fallbackData.markets,
      ...(data.markets || {}),
    },
  };
}

async function loadAppData() {
  try {
    const response = await fetch("recommendations.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`recommendations.json ${response.status}`);
    appData = normalizeData(await response.json());
  } catch (error) {
    console.warn("Using fallback data:", error);
    appData = fallbackData;
  }

  appState.selectedStockCode = getMarketStocks()[0]?.code || "";
}

async function fetchJson(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

function formatIndex(value) {
  return Number(value || 0).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(change) {
  const value = Number(change || 0);
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function setChangeClass(element, change) {
  element.className = change > 0 ? "up" : change < 0 ? "down" : "flat";
}

function getMarketStocks() {
  return appData.markets[appState.selectedMarket]?.stocks || [];
}

function getAllStocks() {
  return Object.values(appData.markets).flatMap((market) => market.stocks || []);
}

function getSelectedStock() {
  return getAllStocks().find((stock) => stock.code === appState.selectedStockCode) || getMarketStocks()[0];
}

function renderMarketSummary() {
  const { marketSummary } = appData;
  selectors.dataStamp.textContent = `데이터 기준: ${appData.asOf} · ${appData.source || "local"} · ${appData.note || "자동 생성 데이터"}`;

  selectors.kospiValue.textContent = formatIndex(marketSummary.kospi.value);
  selectors.kospiChange.textContent = formatChange(marketSummary.kospi.change);
  setChangeClass(selectors.kospiChange, marketSummary.kospi.change);

  selectors.kosdaqValue.textContent = formatIndex(marketSummary.kosdaq.value);
  selectors.kosdaqChange.textContent = formatChange(marketSummary.kosdaq.change);
  setChangeClass(selectors.kosdaqChange, marketSummary.kosdaq.change);

  selectors.usdKrwValue.textContent = formatIndex(marketSummary.usdKrw.value);
  selectors.usdKrwChange.textContent = marketSummary.usdKrw.change === 0 ? "보합" : formatChange(marketSummary.usdKrw.change);
  setChangeClass(selectors.usdKrwChange, marketSummary.usdKrw.change);
}

function stockMetricLine(stock) {
  return `현재가 ${formatWon(stock.price)} · PER ${stock.per} · PBR ${stock.pbr} · 점수 ${stock.score}`;
}

function renderTodayTopList() {
  const stocks = getAllStocks()
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  selectors.todayTopList.innerHTML = stocks
    .map(
      (stock, index) => `
        <button class="summary-row" type="button" data-code="${stock.code}" data-jump-view="stocks">
          <span class="rank">${index + 1}</span>
          <span>
            <strong>${stock.name}</strong>
            <small>${stockMetricLine(stock)}</small>
          </span>
        </button>
      `,
    )
    .join("");
}

function renderRecommendations() {
  selectors.recommendationList.innerHTML = getMarketStocks()
    .map(
      (stock, index) => `
        <article class="stock-row ${stock.code === appState.selectedStockCode ? "selected" : ""}">
          <button class="stock-main" type="button" data-code="${stock.code}">
            <span class="rank">${index + 1}</span>
            <span class="stock-meta">
              <strong>${stock.name} <small>${stock.code}</small></strong>
              <span>PER ${stock.per} · PBR ${stock.pbr} · ${stock.quoteSource || appData.source || "local"}</span>
            </span>
            <span class="stock-price">
              <strong>${formatWon(stock.price)}</strong>
              <em class="${stock.change >= 0 ? "up" : "down"}">${formatChange(stock.change)}</em>
            </span>
            <span class="score-badge">${stock.score}</span>
            <span class="select-hint">보기</span>
          </button>
        </article>
      `,
    )
    .join("");
}

function renderChartMetrics(stock) {
  const trend = stock.trend || {};
  selectors.chartMetrics.innerHTML = `
    <div class="detail-metric"><span>점수</span><strong>${stock.score}</strong></div>
    <div class="detail-metric"><span>PER</span><strong>${stock.per}</strong></div>
    <div class="detail-metric"><span>PBR</span><strong>${stock.pbr}</strong></div>
    <div class="detail-metric"><span>등락률</span><strong class="${stock.change >= 0 ? "up" : "down"}">${formatChange(stock.change)}</strong></div>
    <div class="detail-metric"><span>5일 흐름</span><strong class="${trend.fiveDayChange >= 0 ? "up" : "down"}">${formatChange(trend.fiveDayChange || 0)}</strong></div>
    <div class="detail-metric"><span>거래량비율</span><strong>${Number(trend.volumeRatio || 0).toFixed(2)}</strong></div>
  `;
}

function renderChart() {
  const stock = getSelectedStock();
  if (!stock) return;

  const values = stock.chart || [stock.price, stock.price];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 360;
  const height = 190;
  const padding = 22;
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const fillPath = `${path} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const lineColor = stock.change >= 0 ? "#12825c" : "#d44438";
  const fillColor = stock.change >= 0 ? "rgba(18, 130, 92, 0.13)" : "rgba(212, 68, 56, 0.13)";

  selectors.chartTitle.textContent = stock.name;
  selectors.chartCode.textContent = stock.code;
  selectors.chartPrice.textContent = formatWon(stock.price);
  selectors.chartChange.textContent = formatChange(stock.change);
  selectors.chartChange.className = stock.change >= 0 ? "up" : "down";
  selectors.chartReason.textContent = stock.reason;
  renderChartMetrics(stock);
  selectors.chartBox.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${stock.name} 7일 가격 흐름">
      <path d="${fillPath}" fill="${fillColor}"></path>
      <path d="${path}" fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#fff" stroke="${lineColor}" stroke-width="3"></circle>`).join("")}
      <text x="${padding}" y="20" fill="#6d7888" font-size="12">${formatWon(max)}</text>
      <text x="${padding}" y="${height - 8}" fill="#6d7888" font-size="12">${formatWon(min)}</text>
    </svg>
  `;
  selectors.chartDays.innerHTML = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "오늘"].map((day) => `<span>${day}</span>`).join("");
}

function renderIssues() {
  selectors.issueList.innerHTML = appData.issues.map((issue) => `<li>${issue}</li>`).join("");
}

function renderApproval() {
  if (!appState.approval) {
    selectors.approvalDrawer.hidden = true;
    selectors.pendingCount.textContent = "0건";
    selectors.approvalTitle.textContent = "승인 대기 없음";
    selectors.approvalBody.textContent = "추천, 알림, 주문은 사용자 확인 전에 실행하지 않습니다.";
    return;
  }

  selectors.approvalDrawer.hidden = false;
  selectors.pendingCount.textContent = "1건";
  selectors.approvalTitle.textContent = appState.approval.title;
  selectors.approvalBody.textContent = appState.approval.body;
}

async function loadBrokerConfig() {
  try {
    brokerConfig = await fetchJson("/api/broker-config");
  } catch (error) {
    brokerConfig = {
      providers: [
        { id: "kis", label: "한국투자증권", supported: true, configured: false, enabled: false, virtual: true },
        { id: "mirae", label: "미래에셋증권", supported: false, configured: false, enabled: false, virtual: true },
        { id: "toss", label: "토스증권", supported: false, configured: false, enabled: false, virtual: true },
      ],
      unavailable: true,
    };
  }
  renderBrokerConfig();
}

function selectedProvider() {
  return brokerConfig?.providers?.find((provider) => provider.id === appState.selectedBroker) || brokerConfig?.providers?.[0];
}

function renderBrokerConfig() {
  if (!selectors.brokerTabs || !brokerConfig) return;
  selectors.brokerTabs.innerHTML = brokerConfig.providers
    .map(
      (provider) => `
        <button class="broker-tab ${provider.id === appState.selectedBroker ? "active" : ""}" type="button" data-provider="${provider.id}">
          <strong>${provider.label}</strong>
          <span>${provider.supported ? (provider.configured ? "등록됨" : "등록 필요") : "준비 중"}</span>
        </button>
      `,
    )
    .join("");

  const provider = selectedProvider();
  if (!provider) return;
  selectors.brokerProvider.value = provider.id;
  selectors.brokerEnabled.checked = Boolean(provider.enabled);
  selectors.brokerVirtual.checked = provider.virtual !== false;
  selectors.brokerProductCode.value = provider.productCode || "01";
  selectors.brokerAppKey.value = "";
  selectors.brokerAppSecret.value = "";
  selectors.brokerAccountNo.value = "";
  const disabled = provider.id !== "kis" || brokerConfig.unavailable;
  selectors.brokerForm.querySelectorAll("input, select, button").forEach((item) => {
    item.disabled = disabled && item.id !== "brokerProvider";
  });
  selectors.brokerFormNote.textContent = disabled
    ? "공개 웹 또는 미지원 증권사에서는 저장할 수 없습니다. 현재는 로컬 PC의 한국투자증권만 저장 가능합니다."
    : `현재 저장값: App Key ${provider.appKeyMasked || "-"}, 계좌 ${provider.accountNoMasked || "-"}`;
}

async function loadAccount() {
  if (!selectors.accountStatus) return;
  selectors.accountStatus.textContent = "계좌 정보를 불러오는 중입니다.";
  try {
    const payload = await fetchJson("/api/account");
    if (!payload.ok) {
      selectors.accountTitle.textContent = "계좌 연결 필요";
      selectors.accountStatus.textContent = payload.message || "로컬 계좌 API를 사용할 수 없습니다.";
      renderAccountMetrics();
      renderHoldings([]);
      if (payload.providers) {
        brokerConfig = { providers: payload.providers };
        renderBrokerConfig();
      }
      return;
    }

    const account = payload.account;
    selectors.accountTitle.textContent = `${account.provider} ${account.accountNoMasked}`;
    selectors.accountStatus.textContent = `${account.virtual ? "모의투자" : "실전"} · ${account.fetchedAt}`;
    renderAccountMetrics(account.summary);
    renderHoldings(account.holdings || []);
  } catch (error) {
    selectors.accountTitle.textContent = "로컬 전용 기능";
    selectors.accountStatus.textContent = "공개 웹에서는 계좌 정보를 표시하지 않습니다. PC의 로컬 주소에서 확인하세요.";
    renderAccountMetrics();
    renderHoldings([]);
  }
}

function renderAccountMetrics(summary = {}) {
  selectors.accountMetrics.innerHTML = `
    <div class="detail-metric"><span>총 평가금액</span><strong>${formatWon(summary.totalAmount)}</strong></div>
    <div class="detail-metric"><span>주식 평가금액</span><strong>${formatWon(summary.stockAmount)}</strong></div>
    <div class="detail-metric"><span>예수금</span><strong>${formatWon(summary.cashAmount)}</strong></div>
    <div class="detail-metric"><span>평가손익</span><strong class="${summary.profitLoss >= 0 ? "up" : "down"}">${formatWon(summary.profitLoss)}</strong></div>
  `;
}

function renderHoldings(holdings) {
  selectors.holdingCount.textContent = `${holdings.length}개`;
  if (!holdings.length) {
    selectors.holdingList.innerHTML = `<p class="empty-state">표시할 보유 종목이 없습니다.</p>`;
    return;
  }

  selectors.holdingList.innerHTML = holdings
    .map(
      (item) => `
        <article class="holding-row">
          <span>
            <strong>${item.name || item.code}</strong>
            <small>${item.code} · ${formatQuantity(item.quantity)}주</small>
          </span>
          <span><small>평균단가</small><strong>${formatWon(item.averagePrice)}</strong></span>
          <span><small>현재가</small><strong>${formatWon(item.currentPrice)}</strong></span>
          <span><small>평가금액</small><strong>${formatWon(item.evaluationAmount)}</strong></span>
          <span><small>손익</small><strong class="${item.profitLoss >= 0 ? "up" : "down"}">${formatWon(item.profitLoss)} (${formatChange(item.profitLossRate)})</strong></span>
        </article>
      `,
    )
    .join("");
}

function renderViews() {
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === appState.currentView);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === appState.currentView);
  });
}

function renderApp() {
  renderViews();
  renderMarketSummary();
  renderTodayTopList();
  renderRecommendations();
  renderIssues();
  renderChart();
  renderApproval();
}

function requestApproval(title, body) {
  appState.approval = { title, body };
  renderApproval();
}

function clearApproval(message) {
  appState.approval = null;
  renderApproval();
  if (message) selectors.approvalTitle.textContent = message;
}

function showView(viewName) {
  appState.currentView = viewName;
  renderViews();
  if (viewName === "account") {
    loadBrokerConfig();
    loadAccount();
  }
}

function selectStock(code) {
  appState.selectedStockCode = code;
  const marketEntry = Object.entries(appData.markets).find(([, market]) => market.stocks.some((stock) => stock.code === code));
  if (marketEntry) {
    appState.selectedMarket = marketEntry[0];
    document.querySelectorAll(".segment").forEach((button) => button.classList.toggle("active", button.dataset.market === appState.selectedMarket));
  }
  renderRecommendations();
  renderChart();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-jump-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.dataset.code;
      if (code) selectStock(code);
      showView(button.dataset.jumpView);
    });
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedMarket = button.dataset.market;
      appState.selectedStockCode = getMarketStocks()[0]?.code || "";
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderRecommendations();
      renderChart();
    });
  });

  selectors.recommendationList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-code]");
    if (!button) return;
    selectStock(button.dataset.code);
  });

  selectors.todayTopList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-code]");
    if (!button) return;
    selectStock(button.dataset.code);
    showView("stocks");
  });

  document.querySelector("#runPreview").addEventListener("click", () => {
    requestApproval("오늘 추천 리포트 검토 요청", "추천 후보를 확인했습니다. 승인하면 선택한 알림 채널 기준으로 발송 준비 단계로 넘어갑니다.");
  });

  document.querySelector("#requestAlertApproval").addEventListener("click", () => {
    const telegram = document.querySelector("#telegramToggle").checked;
    const kakao = document.querySelector("#kakaoToggle").checked;
    const channels = [telegram && "텔레그램", kakao && "카카오톡"].filter(Boolean).join(", ");

    if (!channels) {
      requestApproval("알림 채널 선택 필요", "발송 전에 텔레그램 또는 카카오톡 중 하나 이상을 선택해야 합니다.");
      return;
    }

    requestApproval("알림 발송 승인 요청", `${channels}으로 추천 리포트 발송을 준비했습니다. 승인 전에는 전송하지 않습니다.`);
  });

  document.querySelector("#approveAction").addEventListener("click", () => {
    if (!appState.approval) return;
    clearApproval("승인 완료");
  });

  document.querySelector("#rejectAction").addEventListener("click", () => {
    clearApproval("승인 취소됨");
  });

  document.querySelector("#refreshView").addEventListener("click", async () => {
    await loadAppData();
    renderApp();
  });

  selectors.refreshAccount?.addEventListener("click", loadAccount);

  selectors.brokerTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-provider]");
    if (!button) return;
    appState.selectedBroker = button.dataset.provider;
    renderBrokerConfig();
  });

  selectors.brokerProvider?.addEventListener("change", () => {
    appState.selectedBroker = selectors.brokerProvider.value;
    renderBrokerConfig();
  });

  selectors.brokerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (appState.selectedBroker !== "kis") {
      selectors.brokerFormNote.textContent = "현재 저장 가능한 증권사는 한국투자증권입니다.";
      return;
    }

    const payload = {
      provider: "kis",
      enabled: selectors.brokerEnabled.checked,
      virtual: selectors.brokerVirtual.checked,
      appKey: selectors.brokerAppKey.value.trim(),
      appSecret: selectors.brokerAppSecret.value.trim(),
      accountNo: selectors.brokerAccountNo.value.trim(),
      productCode: selectors.brokerProductCode.value.trim() || "01",
    };

    try {
      const result = await fetchJson("/api/broker-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      brokerConfig = result.config;
      selectors.brokerForm.reset();
      appState.selectedBroker = "kis";
      renderBrokerConfig();
      await loadAccount();
      selectors.brokerFormNote.textContent = "저장했습니다. 값은 .env에만 보관됩니다.";
    } catch (error) {
      selectors.brokerFormNote.textContent = `저장 실패: ${error.message}`;
    }
  });
}

async function init() {
  bindEvents();
  await loadAppData();
  renderApp();
  loadBrokerConfig();
}

init();
