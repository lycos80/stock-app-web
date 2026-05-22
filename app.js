let appData = null;

const fallbackData = {
  asOf: "2026-05-15",
  source: "fallback sample",
  note: "예시 데이터",
  disclaimer: "예시 데이터입니다. 실제 투자 판단 전 최신 데이터를 확인하세요.",
  marketSummary: {
    kospi: { value: 7493.18, change: -6.12 },
    kosdaq: { value: 1129.82, change: -5.14 },
    usdKrw: { value: 1364.2, change: 0 },
  },
  issues: ["저PER·저PBR 종목을 우선 점검합니다.", "단기 등락률은 보조 지표로만 반영합니다.", "자동 주문은 실행하지 않습니다."],
  markets: {
    kospi: {
      label: "코스피",
      stocks: [
        {
          name: "삼성전자",
          code: "005930",
          price: 72800,
          change: 1.25,
          per: 12.4,
          pbr: 1.12,
          score: 91,
          chart: [69500, 70100, 69800, 71300, 72100, 71900, 72800],
          reason: "메모리 가격 회복과 온디바이스 AI 수요를 반영했습니다.",
        },
      ],
    },
    kosdaq: {
      label: "코스닥",
      stocks: [
        {
          name: "에코프로비엠",
          code: "247540",
          price: 198700,
          change: 1.92,
          per: 31.2,
          pbr: 3.48,
          score: 82,
          chart: [187000, 190500, 194000, 192300, 195800, 197100, 198700],
          reason: "업황 회복 가능성과 수급 개선 가능성을 반영했습니다.",
        },
      ],
    },
  },
};

const appState = {
  currentView: "today",
  selectedMarket: "kospi",
  selectedStockCode: "",
  approval: null,
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

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("ko-KR")}원`;
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
  return appData.markets[appState.selectedMarket].stocks || [];
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
  return `현재가 ${formatPrice(stock.price)} · PER ${stock.per} · PBR ${stock.pbr} · 점수 ${stock.score}`;
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
              <span>PER ${stock.per} · PBR ${stock.pbr}</span>
            </span>
            <span class="stock-price">
              <strong>${formatPrice(stock.price)}</strong>
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
  selectors.chartMetrics.innerHTML = `
    <div class="detail-metric">
      <span>점수</span>
      <strong>${stock.score}</strong>
    </div>
    <div class="detail-metric">
      <span>PER</span>
      <strong>${stock.per}</strong>
    </div>
    <div class="detail-metric">
      <span>PBR</span>
      <strong>${stock.pbr}</strong>
    </div>
    <div class="detail-metric">
      <span>등락률</span>
      <strong class="${stock.change >= 0 ? "up" : "down"}">${formatChange(stock.change)}</strong>
    </div>
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
    const x = padding + (index * (width - padding * 2)) / (values.length - 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const fillPath = `${path} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const lineColor = stock.change >= 0 ? "#12825c" : "#d44438";
  const fillColor = stock.change >= 0 ? "rgba(18, 130, 92, 0.13)" : "rgba(212, 68, 56, 0.13)";

  selectors.chartTitle.textContent = stock.name;
  selectors.chartCode.textContent = stock.code;
  selectors.chartPrice.textContent = formatPrice(stock.price);
  selectors.chartChange.textContent = formatChange(stock.change);
  selectors.chartChange.className = stock.change >= 0 ? "up" : "down";
  selectors.chartReason.textContent = stock.reason;
  renderChartMetrics(stock);
  selectors.chartBox.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${stock.name} 7일 가격 흐름">
      <path d="${fillPath}" fill="${fillColor}"></path>
      <path d="${path}" fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#fff" stroke="${lineColor}" stroke-width="3"></circle>`).join("")}
      <text x="${padding}" y="20" fill="#6d7888" font-size="12">${formatPrice(max)}</text>
      <text x="${padding}" y="${height - 8}" fill="#6d7888" font-size="12">${formatPrice(min)}</text>
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
    selectors.approvalBody.textContent = "추천, 알림, 주문은 사용자의 명시적 승인 후에만 진행합니다.";
    return;
  }

  selectors.approvalDrawer.hidden = false;
  selectors.pendingCount.textContent = "1건";
  selectors.approvalTitle.textContent = appState.approval.title;
  selectors.approvalBody.textContent = appState.approval.body;
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
}

async function init() {
  bindEvents();
  await loadAppData();
  renderApp();
}

init();
