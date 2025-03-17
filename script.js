// 게임 상태를 관리하는 전역 객체
const gameState = {
    day: 1,
    currentDate: new Date('2025-03-17'),
    speed: 1, // 1: 일반 속도, 2: 빠른 속도, 0: 일시정지
    cash: 10000000, // 기본 시작 금액: 1천만원
    portfolio: {
        crypto: [],
        properties: []
    },
    transactions: [],
    alerts: [],
    loan: {
        amount: 0,
        interest: 0,
        interestRate: 0.0005 // 일일 이자율 (0.05%)
    },
    activities: [], // 하루 동안의 활동 기록
    notifications: [], // 하루 동안의 알림
    settings: {
        dayDuration: 5 * 60 * 1000, // 게임 내 하루는 5분 (밀리초)
        tenantProbability: 0.7, // 세입자가 들어올 확률 (70%)
        tenantLeaveProbability: 0.1, // 세입자가 나갈 확률 (10%)
        bankrupt: false // 파산 상태
    },
    marketTrends: {
        propertyValue: 0.01, // 부동산 가치 상승률 (1%)
        vacancyRate: 0.15 // 공실률 (15%)
    },
    prevTotalAssets: 10000000, // 전일 총 자산 가치
    maxAssets: 10000000, // 최대 자산 가치
    lastDayReset: new Date()
};

// 게임 데이터를 저장할 객체
let gameData = {
    cryptocurrencies: [], // 암호화폐 데이터
    properties: [], // 부동산 데이터
    gameSettings: {} // 게임 설정
};

// DOM 요소들을 캐싱
const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    introModal: document.getElementById('intro-modal'),
    daySummaryModal: document.getElementById('day-summary-modal'),
    saveModal: document.getElementById('save-modal'),
    loadModal: document.getElementById('load-modal'),
    loanModal: document.getElementById('loan-modal'),
    propertyDetailModal: document.getElementById('property-detail-modal'),
    bankruptcyModal: document.getElementById('bankruptcy-modal'),
    
    gameDay: document.getElementById('game-day'),
    gameDate: document.getElementById('game-date'),
    userBalance: document.getElementById('user-balance'),
    
    pauseBtn: document.getElementById('pause-btn'),
    playBtn: document.getElementById('play-btn'),
    fastForwardBtn: document.getElementById('fast-forward-btn'),
    
    coinList: document.getElementById('coin-list'),
    propertyList: document.getElementById('property-list'),
    ownedPropertyList: document.getElementById('owned-property-list'),
    
    currentCoinIcon: document.getElementById('current-coin-icon'),
    currentCoinName: document.getElementById('current-coin-name'),
    currentCoinPrice: document.getElementById('current-coin-price'),
    currentCoinChange: document.getElementById('current-coin-change'),
    
    priceChart: document.getElementById('price-chart'),
    portfolioTotal: document.getElementById('portfolio-total'),
    portfolioAssets: document.getElementById('portfolio-assets'),
    
    orderHistoryList: document.getElementById('order-history-list'),
    priceAlertList: document.getElementById('price-alert-list'),
    
    propertyGrid: document.getElementById('property-grid'),
    ownedPropertyGrid: document.getElementById('owned-property-grid'),
    totalPropertyValue: document.getElementById('total-property-value'),
    monthlyPropertyIncome: document.getElementById('monthly-property-income'),
    
    tradeButton: document.getElementById('trade-button'),
    priceInput: document.getElementById('price-input'),
    amountInput: document.getElementById('amount-input'),
    totalOrderAmount: document.getElementById('total-order-amount'),
    feeAmount: document.getElementById('fee-amount'),
    totalAmount: document.getElementById('total-amount'),
    
    orderList: document.getElementById('order-list'),
    marketHistoryList: document.getElementById('market-history-list'),
    
    notificationToast: document.getElementById('notification-toast'),
    notificationTitle: document.getElementById('notification-title'),
    notificationMessage: document.getElementById('notification-message')
};

// 차트 인스턴스를 저장할 변수
let priceChart;

// 현재 선택된 코인과 부동산
let selectedCoin = null;
let selectedProperty = null;

// 게임 타이머 ID
let gameTimer = null;

/**
 * 게임 초기화 및 시작
 */
async function initGame() {
    try {
        // 게임 데이터 로드
        await loadGameData();
        
        // UI 초기화
        initUI();
        
        // 데이터 초기화
        initGameData();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 로딩 화면 숨기기
        elements.loadingScreen.style.display = 'none';
        
        // 인트로 모달 표시
        elements.introModal.classList.add('active');
    } catch (error) {
        console.error('게임 초기화 중 오류 발생:', error);
        showNotification('오류', '게임 초기화 중 문제가 발생했습니다. 페이지를 새로고침해 주세요.', 'error');
    }
}

/**
 * 게임 데이터 로드
 */
async function loadGameData() {
    try {
        // 암호화폐 데이터 로드
        const cryptoResponse = await fetch('cryptocurrencies.json');
        gameData.cryptocurrencies = await cryptoResponse.json();
        
        // 부동산 데이터 로드
        const propertiesResponse = await fetch('properties.json');
        gameData.properties = await propertiesResponse.json();
        
        // 게임 설정 로드
        const settingsResponse = await fetch('game-settings.json');
        gameData.gameSettings = await settingsResponse.json();
        
        // 게임 설정 적용
        if (gameData.gameSettings) {
            gameState.settings.dayDuration = gameData.gameSettings.dayDuration || gameState.settings.dayDuration;
            gameState.settings.tenantProbability = gameData.gameSettings.tenantProbability || gameState.settings.tenantProbability;
            gameState.settings.tenantLeaveProbability = gameData.gameSettings.tenantLeaveProbability || gameState.settings.tenantLeaveProbability;
        }
    } catch (error) {
        console.error('게임 데이터 로드 중 오류 발생:', error);
        throw new Error('게임 데이터를 로드할 수 없습니다.');
    }
}

/**
 * UI 초기화
 */
function initUI() {
    // 날짜 및 잔액 표시 업데이트
    updateDateDisplay();
    updateBalanceDisplay();
    
    // 암호화폐 목록 초기화
    initCryptoList();
    
    // 부동산 목록 초기화
    initPropertyList();
    
    // 차트 초기화
    initChart();
}

/**
 * 게임 데이터 초기화
 */
function initGameData() {
    // 암호화폐 가격 초기화
    gameData.cryptocurrencies.forEach(crypto => {
        crypto.priceHistory = generatePriceHistory(crypto.initialPrice, 100);
        crypto.currentPrice = crypto.priceHistory[crypto.priceHistory.length - 1].close;
        
        // 24시간 변화율 계산 (오류 방지를 위한 안전 코드 추가)
        try {
            const previousDayPrice = crypto.priceHistory[crypto.priceHistory.length - 24]?.close || crypto.initialPrice;
            crypto.changePercent = ((crypto.currentPrice - previousDayPrice) / previousDayPrice) * 100;
        } catch (e) {
            crypto.changePercent = 0; // 오류 발생 시 기본값 설정
        }
    });
    
    // 프로퍼티 목록 초기화
    gameData.properties.forEach(property => {
        property.purchased = false;
        property.purchaseDate = null;
        property.tenant = null;
    });
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 인트로 모달 버튼
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('load-game-btn').addEventListener('click', () => {
        elements.introModal.classList.remove('active');
        elements.loadModal.classList.add('active');
    });
    
    // 사이드바 탭 전환
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            
            // 메인 콘텐츠도 함께 변경
            document.querySelector('.crypto-view').classList.toggle('active', tab.dataset.tab === 'crypto');
            document.querySelector('.real-estate-view').classList.toggle('active', tab.dataset.tab === 'real-estate');
        });
    });
    
    // 패널 탭 전환
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelector('.trade-content').classList.toggle('active', tab.dataset.tab === 'trade');
            document.querySelector('.order-book').classList.toggle('active', tab.dataset.tab === 'orderbook');
            document.querySelector('.market-history').classList.toggle('active', tab.dataset.tab === 'market');
        });
    });
    
    // 매수/매도 버튼 전환
    document.querySelectorAll('.trade-type button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.trade-type button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            elements.tradeButton.classList.remove('buy', 'sell');
            elements.tradeButton.classList.add(button.classList.contains('buy') ? 'buy' : 'sell');
            elements.tradeButton.textContent = button.classList.contains('buy') ? '매수하기' : '매도하기';
        });
    });
    
    // 거래 실행 버튼
    elements.tradeButton.addEventListener('click', executeTrade);
    
    // 가격 및 수량 입력 시 총액 계산
    elements.priceInput.addEventListener('input', calculateTotalAmount);
    elements.amountInput.addEventListener('input', calculateTotalAmount);
    
    // 차트 기간 옵션
    document.querySelectorAll('.chart-options button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.chart-options button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            updateChart(button.dataset.period);
        });
    });
    
    // 거래 내역 필터
    document.querySelectorAll('.order-history-filter button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.order-history-filter button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            filterTransactionHistory(button.dataset.filter);
        });
    });
    
    // 알림 추가 버튼
    document.getElementById('add-alert-btn').addEventListener('click', () => {
        if (!selectedCoin) return;
        
        const price = prompt(`${selectedCoin.name} 가격 알림 설정 (KRW):`, Math.round(selectedCoin.currentPrice).toLocaleString());
        if (!price) return;
        
        const numericPrice = Number(price.replace(/,/g, ''));
        if (isNaN(numericPrice) || numericPrice <= 0) {
            showNotification('오류', '유효한 가격을 입력해주세요.', 'error');
            return;
        }
        
        const condition = confirm('가격이 입력한 값보다 높을 때 알림을 받으시겠습니까? (확인: 이상, 취소: 이하)');
        
        const alert = {
            id: Date.now(),
            coinId: selectedCoin.id,
            coinName: selectedCoin.name,
            price: numericPrice,
            condition: condition ? 'above' : 'below',
            triggered: false
        };
        
        gameState.alerts.push(alert);
        updateAlertsList();
        
        showNotification('알림 추가', `${selectedCoin.name} ${condition ? '이상' : '이하'} ${numericPrice.toLocaleString()}원 알림이 설정되었습니다.`, 'success');
    });
    
    // 알림 삭제 이벤트(동적으로 추가된 요소를 위한 이벤트 위임)
    document.getElementById('price-alert-list').addEventListener('click', event => {
        if (event.target.classList.contains('fa-trash') || event.target.closest('.delete-alert')) {
            const alertItem = event.target.closest('.alert-item');
            if (alertItem) {
                const alertId = Number(alertItem.dataset.id);
                gameState.alerts = gameState.alerts.filter(alert => alert.id !== alertId);
                updateAlertsList();
            }
        }
    });
    
    // 게임 속도 제어
    elements.pauseBtn.addEventListener('click', () => pauseGame());
    elements.playBtn.addEventListener('click', () => resumeGame());
    elements.fastForwardBtn.addEventListener('click', () => fastForwardGame());
    
    // 대출 버튼
    document.getElementById('loan-btn').addEventListener('click', () => {
        updateLoanModalInfo();
        elements.loanModal.classList.add('active');
    });
    
    // 저장 버튼
    document.getElementById('save-btn').addEventListener('click', () => {
        document.getElementById('save-current-date').textContent = formatDate(gameState.currentDate);
        document.getElementById('save-game-day').textContent = gameState.day;
        document.getElementById('save-total-assets').textContent = '₩' + calculateTotalAssets().toLocaleString();
        elements.saveModal.classList.add('active');
    });
    
    // 닫기 버튼들
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', event => {
            event.target.closest('.modal').classList.remove('active');
        });
    });
    
    // 알림 토스트 닫기
    document.querySelector('.notification-close').addEventListener('click', () => {
        elements.notificationToast.classList.remove('show');
    });
    
    // 대출 신청 버튼
    document.getElementById('apply-loan-btn').addEventListener('click', applyForLoan);
    
    // 대출 상환 버튼
    document.getElementById('repay-loan-btn').addEventListener('click', repayLoan);
    
    // 대출 금액 컨트롤
    document.getElementById('loan-amount-increase').addEventListener('click', () => {
        const input = document.getElementById('loan-amount');
        const currentValue = Number(input.value.replace(/,/g, '')) || 0;
        input.value = (currentValue + 1000000).toLocaleString(); // 백만원 증가
    });
    
    document.getElementById('loan-amount-decrease').addEventListener('click', () => {
        const input = document.getElementById('loan-amount');
        const currentValue = Number(input.value.replace(/,/g, '')) || 0;
        if (currentValue >= 1000000) {
            input.value = (currentValue - 1000000).toLocaleString(); // 백만원 감소
        }
    });
    
    // 상환 금액 컨트롤
    document.getElementById('repay-amount-increase').addEventListener('click', () => {
        const input = document.getElementById('repay-amount');
        const currentValue = Number(input.value.replace(/,/g, '')) || 0;
        input.value = (currentValue + 1000000).toLocaleString(); // 백만원 증가
    });
    
    document.getElementById('repay-amount-decrease').addEventListener('click', () => {
        const input = document.getElementById('repay-amount');
        const currentValue = Number(input.value.replace(/,/g, '')) || 0;
        if (currentValue >= 1000000) {
            input.value = (currentValue - 1000000).toLocaleString(); // 백만원 감소
        }
    });
    
    // 저장 확인 버튼
    document.getElementById('confirm-save-btn').addEventListener('click', saveGame);
    
    // 불러오기 파일 선택
    document.getElementById('load-file').addEventListener('change', handleFileSelect);
    
    // 불러오기 확인 버튼
    document.getElementById('confirm-load-btn').addEventListener('click', loadGame);
    
    // 하루 요약 모달 계속하기 버튼
    document.getElementById('continue-day-btn').addEventListener('click', () => {
        elements.daySummaryModal.classList.remove('active');
        resumeGame();
    });
    
    // 파산 모달 새 게임 버튼
    document.getElementById('new-game-btn').addEventListener('click', () => {
        location.reload(); // 페이지 새로고침으로 새 게임 시작
    });
    
    // 부동산 유형 필터
    document.getElementById('property-type-filter').addEventListener('change', filterProperties);
    
    // 부동산 가격 필터
    document.getElementById('price-range-filter').addEventListener('change', filterProperties);
    
    // 부동산 검색
    document.getElementById('property-search').addEventListener('input', filterProperties);
    
    // 코인 검색
    document.getElementById('crypto-search').addEventListener('input', filterCryptos);
}

/**
 * 게임 시작
 */
function startGame() {
    elements.introModal.classList.remove('active');
    startGameTimer();
}

/**
 * 게임 타이머 시작
 */
function startGameTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    const timerSpeed = gameState.speed === 2 ? 500 : 1000; // 일반 속도: 1초, 빠른 속도: 0.5초
    
    gameTimer = setInterval(() => {
        if (gameState.speed === 0) return; // 일시정지 상태면 아무것도 하지 않음
        
        // 현재 시간과 마지막 날짜 리셋 시간의 차이를 계산
        const now = new Date();
        const elapsedTime = now - gameState.lastDayReset;
        
        // 하루가 지났는지 확인
        if (elapsedTime >= gameState.settings.dayDuration / gameState.speed) {
            advanceDay();
        }
        
        // 프로그레스 표시 로직 (필요시 구현)
    }, timerSpeed);
}

/**
 * 하루 진행
 */
function advanceDay() {
    // 일시 정지
    pauseGame();
    
    // 이전 총 자산 저장
    gameState.prevTotalAssets = calculateTotalAssets();
    
    // 날짜 증가
    gameState.day++;
    gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
    
    // 암호화폐 가격 업데이트
    updateCryptoPrices();
    
    // 부동산 관련 업데이트
    updateProperties();
    
    // 대출 이자 계산
    calculateLoanInterest();
    
    // 파산 체크
    checkBankruptcy();
    
    // 다음 날 시작 시간 업데이트
    gameState.lastDayReset = new Date();
    
    // UI 업데이트
    updateDateDisplay();
    updateBalanceDisplay();
    updatePortfolioDisplay();
    updateCryptoUI();
    updatePropertyUI();
    
    // 활동 내역에 날짜 변경 추가
    gameState.activities.push(`${formatDate(gameState.currentDate)} 날짜가 변경되었습니다.`);
    
    // 자산 최대값 업데이트
    const currentAssets = calculateTotalAssets();
    if (currentAssets > gameState.maxAssets) {
        gameState.maxAssets = currentAssets;
    }
    
    // 하루 요약 모달 표시
    showDaySummary();
}

/**
 * 하루 요약 모달 표시
 */
function showDaySummary() {
    // 날짜 및 일차 표시
    document.getElementById('day-summary-day').textContent = gameState.day;
    document.getElementById('day-summary-date').textContent = formatDate(gameState.currentDate);
    
    // 자산 변화
    const currentAssets = calculateTotalAssets();
    document.getElementById('prev-total-assets').textContent = '₩' + gameState.prevTotalAssets.toLocaleString();
    document.getElementById('current-total-assets').textContent = '₩' + currentAssets.toLocaleString();
    
    const assetChange = currentAssets - gameState.prevTotalAssets;
    const changePercent = (assetChange / gameState.prevTotalAssets) * 100;
    
    const changeElement = document.getElementById('assets-change');
    changeElement.textContent = `₩${assetChange.toLocaleString()} (${changePercent.toFixed(2)}%)`;
    changeElement.style.color = assetChange >= 0 ? 'var(--positive-color)' : 'var(--negative-color)';
    
    // 활동 내역
    const activitiesList = document.getElementById('day-activities');
    activitiesList.innerHTML = '';
    
    gameState.activities.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = activity;
        activitiesList.appendChild(li);
    });
    
    // 알림 사항
    const notificationsList = document.getElementById('day-notifications');
    notificationsList.innerHTML = '';
    
    gameState.notifications.forEach(notification => {
        const li = document.createElement('li');
        li.className = notification.type;
        
        const icon = document.createElement('i');
        icon.className = getNotificationIcon(notification.type);
        
        li.appendChild(icon);
        li.appendChild(document.createTextNode(notification.message));
        notificationsList.appendChild(li);
    });
    
    // 활동 및 알림 초기화 (다음 날을 위해)
    gameState.activities = [];
    gameState.notifications = [];
    
    // 모달 표시
    elements.daySummaryModal.classList.add('active');
}

/**
 * 알림 아이콘 가져오기
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'info':
            return 'fas fa-info-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        case 'success':
            return 'fas fa-check-circle';
        case 'danger':
            return 'fas fa-radiation';
        default:
            return 'fas fa-bell';
    }
}

/**
 * 암호화폐 가격 업데이트
 */
function updateCryptoPrices() {
    gameData.cryptocurrencies.forEach(crypto => {
        // 이전 가격 저장
        const previousPrice = crypto.currentPrice;
        
        // 새로운 가격 생성
        const volatility = crypto.volatility || 0.03; // 기본 변동성: 3%
        const changePercent = (Math.random() - 0.5) * volatility * 2;
        const newPrice = previousPrice * (1 + changePercent);
        
        // 최소 가격 보장
        crypto.currentPrice = Math.max(newPrice, crypto.initialPrice * 0.01);
        
        // 가격 기록 추가
        const now = new Date(gameState.currentDate);
        const newCandle = {
            time: now,
            open: previousPrice,
            high: Math.max(previousPrice, crypto.currentPrice),
            low: Math.min(previousPrice, crypto.currentPrice),
            close: crypto.currentPrice,
            volume: Math.random() * 100
        };
        
        crypto.priceHistory.push(newCandle);
        
        // 최대 기록 개수 제한
        if (crypto.priceHistory.length > 365) {
            crypto.priceHistory.shift();
        }
        
        // 24시간 변화율 계산
        const prev24hPrice = crypto.priceHistory[crypto.priceHistory.length - 2].close;
        crypto.changePercent = ((crypto.currentPrice - prev24hPrice) / prev24hPrice) * 100;
        
        // 가격 알림 체크
        checkPriceAlerts(crypto);
    });
}

/**
 * 부동산 업데이트
 */
function updateProperties() {
    // 모든 소유 부동산 확인
    const ownedProperties = gameData.properties.filter(property => property.purchased);
    
    ownedProperties.forEach(property => {
        // 임대료 수입 (세입자가 있는 경우)
        if (property.tenant) {
            // 월세 수입은 30일에 한번 발생
            if (gameState.currentDate.getDate() === 1) {
                const rentIncome = property.monthlyRent;
                gameState.cash += rentIncome;
                
                gameState.activities.push(`${property.name}에서 월세 ${rentIncome.toLocaleString()}원이 발생했습니다.`);
                gameState.notifications.push({
                    type: 'success',
                    message: `${property.name}에서 월세 ${rentIncome.toLocaleString()}원을 수령했습니다.`
                });
            }
            
            // 세입자 퇴거 확률
            if (Math.random() < gameState.settings.tenantLeaveProbability) {
                property.tenant = null;
                
                gameState.activities.push(`${property.name}의 세입자가 퇴거했습니다.`);
                gameState.notifications.push({
                    type: 'warning',
                    message: `${property.name}의 세입자가 퇴거했습니다. 새 세입자를 찾아야 합니다.`
                });
            }
        } else {
            // 세입자가 없는 경우, 새 세입자 유치 확률
            if (Math.random() < gameState.settings.tenantProbability) {
                property.tenant = generateTenant();
                
                gameState.activities.push(`${property.name}에 새 세입자가 입주했습니다.`);
                gameState.notifications.push({
                    type: 'success',
                    message: `${property.name}에 새 세입자가 입주했습니다. 월 ${property.monthlyRent.toLocaleString()}원의 임대 수입이 발생합니다.`
                });
            }
        }
        
        // 부동산 가치 변동
        const valueChange = 1 + (Math.random() * 0.02 - 0.005); // -0.5% ~ 1.5% 변동
        property.currentPrice = property.purchased ? Math.round(property.purchasePrice * valueChange) : property.price;
    });
    
    // 시장 동향 업데이트
    updateMarketTrends();
}

/**
 * 세입자 생성
 */
function generateTenant() {
    const names = ['김민준', '이지현', '박준혁', '최서연', '정민수', '강지원', '황민지', '윤서진', '서우진', '임지은'];
    const ages = [25, 27, 30, 32, 35, 38, 40, 45, 50, 55];
    const occupations = ['회사원', '공무원', '자영업자', '전문직', '대학생', '대학원생', '프리랜서', '교사', '연구원', '은퇴자'];
    
    return {
        name: names[Math.floor(Math.random() * names.length)],
        age: ages[Math.floor(Math.random() * ages.length)],
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
        moveInDate: new Date(gameState.currentDate),
        contractPeriod: 6 + Math.floor(Math.random() * 18) // 6~24개월
    };
}

/**
 * 시장 동향 업데이트
 */
function updateMarketTrends() {
    // 부동산 가치 상승률 업데이트
    gameState.marketTrends.propertyValue = 0.005 + Math.random() * 0.02; // 0.5% ~ 2.5%
    
    // 공실률 업데이트
    const ownedProperties = gameData.properties.filter(property => property.purchased);
    const vacantProperties = ownedProperties.filter(property => !property.tenant);
    
    gameState.marketTrends.vacancyRate = ownedProperties.length > 0 ? 
        vacantProperties.length / ownedProperties.length : 
        0.15;
    
    // UI 업데이트
    document.getElementById('avg-roi').textContent = `${(gameState.marketTrends.propertyValue * 100).toFixed(1)}%`;
    document.getElementById('vacancy-rate').textContent = `${(gameState.marketTrends.vacancyRate * 100).toFixed(0)}%`;
    
    // 시장 트렌드 표시
    const marketTrendElement = document.getElementById('market-trend');
    const trend = Math.random() > 0.3; // 70% 확률로 상승
    
    marketTrendElement.innerHTML = trend ? 
        '<i class="fas fa-arrow-up"></i> 상승' : 
        '<i class="fas fa-arrow-down"></i> 하락';
    
    marketTrendElement.style.color = trend ? 'var(--positive-color)' : 'var(--negative-color)';
}

/**
 * 대출 이자 계산
 */
function calculateLoanInterest() {
    if (gameState.loan.amount > 0) {
        const dailyInterest = gameState.loan.amount * gameState.loan.interestRate;
        gameState.loan.interest += dailyInterest;
        
        gameState.activities.push(`대출 이자 ${Math.round(dailyInterest).toLocaleString()}원이 발생했습니다.`);
        
        // 이자가 위험수준에 근접하면 알림
        if (gameState.loan.interest > 8000000 && gameState.loan.interest < 9000000) {
            gameState.notifications.push({
                type: 'warning',
                message: `누적 대출 이자가 ${Math.round(gameState.loan.interest).toLocaleString()}원에 도달했습니다. 파산이 임박했습니다!`
            });
        }
    }
}

/**
 * 파산 체크
 */
function checkBankruptcy() {
    if (gameState.loan.interest >= 10000000) {
        gameState.settings.bankrupt = true;
        
        // 일시정지
        pauseGame();
        
        // 파산 모달 정보 설정
        document.getElementById('survived-days').textContent = gameState.day;
        document.getElementById('max-assets').textContent = '₩' + gameState.maxAssets.toLocaleString();
        document.getElementById('owned-properties').textContent = gameData.properties.filter(p => p.purchased).length;
        
        // 파산 모달 표시
        elements.bankruptcyModal.classList.add('active');
        
        gameState.notifications.push({
            type: 'danger',
            message: '누적 대출 이자가 1천만원을 초과하여 파산했습니다!'
        });
    }
}

/**
 * 가격 알림 체크
 */
function checkPriceAlerts(crypto) {
    gameState.alerts.forEach(alert => {
        if (alert.coinId === crypto.id && !alert.triggered) {
            const isAbove = alert.condition === 'above' && crypto.currentPrice >= alert.price;
            const isBelow = alert.condition === 'below' && crypto.currentPrice <= alert.price;
            
            if (isAbove || isBelow) {
                alert.triggered = true;
                
                const message = `${crypto.name} 가격이 ${alert.price.toLocaleString()}원 ${isAbove ? '이상' : '이하'}로 ${crypto.currentPrice.toLocaleString()}원이 되었습니다.`;
                
                gameState.notifications.push({
                    type: 'info',
                    message: message
                });
                
                showNotification('가격 알림', message, 'info');
            }
        }
    });
    
    // 트리거된 알림 제거 및 UI 업데이트
    gameState.alerts = gameState.alerts.filter(alert => !alert.triggered);
    updateAlertsList();
}

/**
 * 게임 일시정지
 */
function pauseGame() {
    gameState.speed = 0;
    elements.pauseBtn.classList.add('active');
    elements.playBtn.classList.remove('active');
    elements.fastForwardBtn.classList.remove('active');
}

/**
 * 게임 재개
 */
function resumeGame() {
    gameState.speed = 1;
    elements.pauseBtn.classList.remove('active');
    elements.playBtn.classList.add('active');
    elements.fastForwardBtn.classList.remove('active');
}

/**
 * 게임 빨리감기
 */
function fastForwardGame() {
    gameState.speed = 2;
    elements.pauseBtn.classList.remove('active');
    elements.playBtn.classList.remove('active');
    elements.fastForwardBtn.classList.add('active');
}

/**
 * 암호화폐 목록 초기화
 */
// 암호화폐 목록 초기화 함수 수정 (약 830줄 부근)
function initCryptoList() {
    elements.coinList.innerHTML = '';
    
    gameData.cryptocurrencies.forEach(crypto => {
        // changePercent 속성이 없을 경우 기본값 0 설정
        const changePercent = crypto.changePercent || 0;
        
        const li = document.createElement('li');
        li.className = 'coin-item';
        li.dataset.id = crypto.id;
        
        li.innerHTML = `
            <div class="coin-info">
                <div class="coin-icon">${crypto.symbol.charAt(0)}</div>
                <div class="coin-name">${crypto.name}</div>
            </div>
            <div class="coin-change ${changePercent >= 0 ? 'positive' : 'negative'}">
                ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%
            </div>
        `;
        
        li.addEventListener('click', () => {
            selectCoin(crypto);
        });
        
        elements.coinList.appendChild(li);
    });
    
    // 첫 번째 코인 선택
    if (gameData.cryptocurrencies.length > 0) {
        selectCoin(gameData.cryptocurrencies[0]);
    }
}

/**
 * 부동산 목록 초기화
 */
function initPropertyList() {
    elements.propertyList.innerHTML = '';
    elements.propertyGrid.innerHTML = '';
    
    gameData.properties.forEach(property => {
        if (!property.purchased) {
            // 사이드바 목록 아이템
            const li = document.createElement('li');
            li.className = 'property-item';
            li.dataset.id = property.id;
            
            li.innerHTML = `
                <div class="property-item-image">
                    <img src="${property.images[0]}" alt="${property.name}">
                </div>
                <div class="property-item-info">
                    <div class="property-item-name">${property.name}</div>
                    <div class="property-item-location">${property.location}</div>
                    <div class="property-item-price">₩${property.price.toLocaleString()}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                openPropertyDetail(property);
            });
            
            elements.propertyList.appendChild(li);
            
            // 메인 그리드 카드
            const card = document.createElement('div');
            card.className = 'property-card';
            card.dataset.id = property.id;
            
            card.innerHTML = `
                <div class="property-card-image">
                    <img src="${property.images[0]}" alt="${property.name}">
                </div>
                <div class="property-card-content">
                    <div class="property-card-title">${property.name}</div>
                    <div class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
                    <div class="property-card-info">
                        <div class="property-card-price">₩${property.price.toLocaleString()}</div>
                        <div class="property-card-stats">
                            <div class="stat"><i class="fas fa-ruler-combined"></i> ${property.size}</div>
                            <div class="stat"><i class="fas fa-home"></i> ${property.type}</div>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                openPropertyDetail(property);
            });
            
            elements.propertyGrid.appendChild(card);
        }
    });
}

/**
 * 소유 부동산 목록 업데이트
 */
function updateOwnedPropertyList() {
    elements.ownedPropertyList.innerHTML = '';
    elements.ownedPropertyGrid.innerHTML = '';
    
    const ownedProperties = gameData.properties.filter(property => property.purchased);
    
    // 소유 부동산이 없을 경우 메시지 표시
    if (ownedProperties.length === 0) {
        elements.ownedPropertyList.innerHTML = '<div class="empty-list">소유하고 있는 부동산이 없습니다.</div>';
        elements.ownedPropertyGrid.innerHTML = '<div class="empty-list">소유하고 있는 부동산이 없습니다. 첫 부동산을 구매해보세요!</div>';
        return;
    }
    
    // 총 자산 가치 및 월 수익 계산
    let totalValue = 0;
    let monthlyIncome = 0;
    
    ownedProperties.forEach(property => {
        totalValue += property.currentPrice || property.purchasePrice;
        
        if (property.tenant) {
            monthlyIncome += property.monthlyRent;
        }
        
        // 사이드바 목록 아이템
        const li = document.createElement('li');
        li.className = 'property-item owned-property-item';
        li.dataset.id = property.id;
        
        li.innerHTML = `
            <div class="property-item-image">
                <img src="${property.images[0]}" alt="${property.name}">
            </div>
            <div class="property-item-info">
                <div class="property-item-name">${property.name}</div>
                <div class="property-item-location">${property.location}</div>
                <div class="property-status-badge ${property.tenant ? 'occupied' : 'vacant'}">
                    ${property.tenant ? '임대 중' : '공실'}
                </div>
            </div>
        `;
        
        li.addEventListener('click', () => {
            openPropertyDetail(property);
        });
        
        elements.ownedPropertyList.appendChild(li);
        
        // 메인 그리드 카드
        const card = document.createElement('div');
        card.className = 'owned-property-card';
        card.dataset.id = property.id;
        
        const currentValue = property.currentPrice || property.purchasePrice;
        const valueChange = property.purchasePrice ? ((currentValue - property.purchasePrice) / property.purchasePrice) * 100 : 0;
        
        card.innerHTML = `
            <div class="property-card-image">
                <img src="${property.images[0]}" alt="${property.name}">
            </div>
            <div class="property-card-content">
                <div class="property-badge ${property.tenant ? 'occupied' : 'vacant'}">
                    ${property.tenant ? '임대 중' : '공실'}
                </div>
                <div class="property-card-title">${property.name}</div>
                <div class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
                <div class="property-card-info">
                    <div class="property-card-price">₩${currentValue.toLocaleString()}</div>
                    <div class="property-card-stats">
                        <div class="stat"><i class="fas fa-chart-line"></i> ${valueChange.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="property-income">
                    <div class="label">월 수익:</div>
                    <div class="value ${property.tenant ? 'positive' : 'negative'}">
                        ${property.tenant ? '₩' + property.monthlyRent.toLocaleString() : '₩0 (공실)'}
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openPropertyDetail(property);
        });
        
        elements.ownedPropertyGrid.appendChild(card);
    });
    
    // 총 자산 가치 및 월 수익 표시
    elements.totalPropertyValue.textContent = '₩' + totalValue.toLocaleString();
    elements.monthlyPropertyIncome.textContent = '₩' + monthlyIncome.toLocaleString();
}

/**
 * 부동산 상세 정보 모달 열기
 */
function openPropertyDetail(property) {
    selectedProperty = property;
    
    // 기본 정보 설정
    document.getElementById('property-title').textContent = property.name;
    document.getElementById('property-main-img').src = property.images[0];
    document.getElementById('property-location').textContent = property.location;
    document.getElementById('property-size').textContent = property.size;
    document.getElementById('property-type').textContent = property.type;
    document.getElementById('property-year').textContent = property.year + '년';
    document.getElementById('property-price').textContent = '₩' + (property.currentPrice || property.price).toLocaleString();
    document.getElementById('property-rent').textContent = '₩' + property.monthlyRent.toLocaleString();
    document.getElementById('property-description-text').textContent = property.description;
    
    // 갤러리 썸네일 생성
    const galleryThumbs = document.getElementById('property-gallery-thumbs');
    galleryThumbs.innerHTML = '';
    
    property.images.forEach((img, index) => {
        const thumb = document.createElement('div');
        thumb.className = `gallery-thumb ${index === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<img src="${img}" alt="이미지 ${index + 1}">`;
        
        thumb.addEventListener('click', () => {
            document.getElementById('property-main-img').src = img;
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
        
        galleryThumbs.appendChild(thumb);
    });
    
    // 소유 상태에 따른 UI 변경
    const ownedSection = document.getElementById('property-owned-status');
    const tenantSection = document.getElementById('tenant-info-section');
    const modalFooter = document.getElementById('property-modal-footer');
    
    if (property.purchased) {
        ownedSection.classList.add('active');
        
        // 소유 정보 표시
        document.getElementById('property-purchase-date').textContent = formatDate(property.purchaseDate);
        
        const currentValue = property.currentPrice || property.purchasePrice;
        const roi = ((currentValue - property.purchasePrice) / property.purchasePrice) * 100;
        document.getElementById('property-roi').textContent = roi.toFixed(2) + '%';
        document.getElementById('property-roi').style.color = roi >= 0 ? 'var(--positive-color)' : 'var(--negative-color)';
        
        document.getElementById('property-tenant-status').textContent = property.tenant ? '임대 중' : '공실';
        document.getElementById('property-tenant-status').style.color = property.tenant ? 'var(--positive-color)' : 'var(--negative-color)';
        
        document.getElementById('property-monthly-income').textContent = property.tenant ? '₩' + property.monthlyRent.toLocaleString() : '₩0';
        
        // 세입자 정보
        if (property.tenant) {
            tenantSection.classList.add('active');
            const tenantDetails = document.getElementById('tenant-details');
            
            tenantDetails.innerHTML = `
                <div class="tenant-row">
                    <div class="label">이름:</div>
                    <div class="value">${property.tenant.name}</div>
                </div>
                <div class="tenant-row">
                    <div class="label">나이:</div>
                    <div class="value">${property.tenant.age}세</div>
                </div>
                <div class="tenant-row">
                    <div class="label">직업:</div>
                    <div class="value">${property.tenant.occupation}</div>
                </div>
                <div class="tenant-row">
                    <div class="label">입주일:</div>
                    <div class="value">${formatDate(property.tenant.moveInDate)}</div>
                </div>
                <div class="tenant-row">
                    <div class="label">계약기간:</div>
                    <div class="value">${property.tenant.contractPeriod}개월</div>
                </div>
            `;
        } else {
            tenantSection.classList.remove('active');
        }
        
        // 푸터 버튼 (판매 버튼)
        modalFooter.innerHTML = `
            <button class="property-action-btn sell" id="sell-property-btn">
                <i class="fas fa-money-bill-wave"></i> 매각하기
            </button>
        `;
        
        // 매각 버튼 이벤트
        document.getElementById('sell-property-btn').addEventListener('click', () => {
            sellProperty(property);
        });
    } else {
        ownedSection.classList.remove('active');
        tenantSection.classList.remove('active');
        
        // 푸터 버튼 (구매 버튼)
        modalFooter.innerHTML = `
            <button class="property-action-btn buy" id="buy-property-btn">
                <i class="fas fa-home"></i> 구매하기
            </button>
        `;
        
        // 구매 버튼 이벤트
        document.getElementById('buy-property-btn').addEventListener('click', () => {
            buyProperty(property);
        });
    }
    
    // 모달 표시
    elements.propertyDetailModal.classList.add('active');
}

/**
 * 부동산 구매
 */
function buyProperty(property) {
    const price = property.price;
    
    if (gameState.cash < price) {
        showNotification('자금 부족', `구매를 위해 ${price.toLocaleString()}원이 필요합니다.`, 'error');
        return;
    }
    
    // 확인 메시지
    if (confirm(`${property.name}을(를) ${price.toLocaleString()}원에 구매하시겠습니까?`)) {
        // 구매 처리
        gameState.cash -= price;
        property.purchased = true;
        property.purchasePrice = price;
        property.currentPrice = price;
        property.purchaseDate = new Date(gameState.currentDate);
        
        // 구매 활동 기록
        gameState.activities.push(`${property.name}을(를) ${price.toLocaleString()}원에 구매했습니다.`);
        
        // UI 업데이트
        updateBalanceDisplay();
        updatePropertyUI();
        elements.propertyDetailModal.classList.remove('active');
        
        showNotification('부동산 구매', `${property.name}을(를) ${price.toLocaleString()}원에 구매했습니다.`, 'success');
    }
}

/**
 * 부동산 매각
 */
function sellProperty(property) {
    const price = property.currentPrice || property.purchasePrice;
    
    // 확인 메시지
    if (confirm(`${property.name}을(를) ${price.toLocaleString()}원에 매각하시겠습니까?`)) {
        // 매각 처리
        gameState.cash += price;
        property.purchased = false;
        property.purchasePrice = null;
        property.purchaseDate = null;
        property.tenant = null;
        
        // 매각 활동 기록
        gameState.activities.push(`${property.name}을(를) ${price.toLocaleString()}원에 매각했습니다.`);
        
        // UI 업데이트
        updateBalanceDisplay();
        updatePropertyUI();
        elements.propertyDetailModal.classList.remove('active');
        
        showNotification('부동산 매각', `${property.name}을(를) ${price.toLocaleString()}원에 매각했습니다.`, 'success');
    }
}

/**
 * 암호화폐 선택
 */
function selectCoin(crypto) {
    selectedCoin = crypto;
    
    // 선택된 코인 표시
    document.querySelectorAll('.coin-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === crypto.id);
    });
    
    // 코인 정보 표시
    elements.currentCoinIcon.textContent = crypto.symbol.charAt(0);
    elements.currentCoinName.textContent = crypto.name;
    elements.currentCoinPrice.textContent = '₩' + Math.round(crypto.currentPrice).toLocaleString();
    
    const changeText = `${crypto.changePercent >= 0 ? '+' : ''}${crypto.changePercent.toFixed(1)}%`;
    elements.currentCoinChange.textContent = changeText;
    elements.currentCoinChange.className = `change ${crypto.changePercent >= 0 ? 'positive' : 'negative'}`;
    
    // 거래 패널 업데이트
    elements.priceInput.value = Math.round(crypto.currentPrice).toLocaleString();
    calculateTotalAmount();
    
    // 차트 업데이트
    updateChart('1D');
    
    // 호가창 업데이트
    updateOrderBook(crypto);
    
    // 시장 기록 업데이트
    updateMarketHistory(crypto);
}

/**
 * 차트 초기화
 */
function initChart() {
    const ctx = elements.priceChart.getContext('2d');
    
    // 차트 설정
    priceChart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: '가격',
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(234, 236, 239, 0.7)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(234, 236, 239, 0.7)',
                        callback: function(value) {
                            return '₩' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = context.raw;
                            return [
                                '시가: ₩' + data.o.toLocaleString(),
                                '고가: ₩' + data.h.toLocaleString(),
                                '저가: ₩' + data.l.toLocaleString(),
                                '종가: ₩' + data.c.toLocaleString()
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * 차트 업데이트
 */
function updateChart(period) {
    if (!selectedCoin || !priceChart) return;
    
    let dataPoints = [];
    const history = selectedCoin.priceHistory;
    
    // 기간에 따른 데이터 필터링
    switch (period) {
        case '1D':
            dataPoints = history.slice(-24);
            break;
        case '1W':
            dataPoints = history.slice(-168); // 24 * 7
            break;
        case '1M':
            dataPoints = history.slice(-720); // 24 * 30
            break;
        case '3M':
            dataPoints = history.slice(-2160); // 24 * 90
            break;
        case '1Y':
            dataPoints = history; // 최대 365일 (history에 저장된 경우)
            break;
        case 'ALL':
            dataPoints = history;
            break;
    }
    
    // 차트 데이터 변환
    const chartData = dataPoints.map(candle => ({
        x: candle.time,
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close
    }));
    
    // 차트 업데이트
    priceChart.data.datasets[0].data = chartData;
    priceChart.update();
}

/**
 * 호가창 업데이트
 */
function updateOrderBook(crypto) {
    elements.orderList.innerHTML = '';
    
    const basePrice = crypto.currentPrice;
    
    // 매도 호가 생성 (5개)
    for (let i = 5; i > 0; i--) {
        const price = basePrice * (1 + (i * 0.001));
        const amount = 0.1 + Math.random() * 0.4;
        const total = price * amount;
        
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item sell';
        
        // 호가 바 너비 계산 (최대 90%)
        const barWidth = (total / (basePrice * 0.5)) * 90;
        
        orderItem.innerHTML = `
            <div class="order-price">${Math.round(price).toLocaleString()}</div>
            <div class="order-amount">${amount.toFixed(4)}</div>
            <div class="order-total order-bar" style="--width: ${barWidth}%">${Math.round(total).toLocaleString()}</div>
        `;
        
        elements.orderList.appendChild(orderItem);
    }
    
    // 현재가 표시
    const currentPrice = document.createElement('div');
    currentPrice.className = 'current-price';
    currentPrice.innerHTML = `<div class="price">${Math.round(basePrice).toLocaleString()}</div>`;
    elements.orderList.appendChild(currentPrice);
    
    // 매수 호가 생성 (5개)
    for (let i = 1; i <= 5; i++) {
        const price = basePrice * (1 - (i * 0.001));
        const amount = 0.1 + Math.random() * 0.4;
        const total = price * amount;
        
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item buy';
        
        // 호가 바 너비 계산 (최대 90%)
        const barWidth = (total / (basePrice * 0.5)) * 90;
        
        orderItem.innerHTML = `
            <div class="order-price">${Math.round(price).toLocaleString()}</div>
            <div class="order-amount">${amount.toFixed(4)}</div>
            <div class="order-total order-bar" style="--width: ${barWidth}%">${Math.round(total).toLocaleString()}</div>
        `;
        
        elements.orderList.appendChild(orderItem);
    }
}

/**
 * 시장 기록 업데이트
 */
function updateMarketHistory(crypto) {
    elements.marketHistoryList.innerHTML = '';
    
    // 최근 10개의 가상 거래 생성
    const basePrice = crypto.currentPrice;
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
        const isBuy = Math.random() > 0.5;
        const price = basePrice * (1 + (Math.random() * 0.004 - 0.002));
        const amount = 0.01 + Math.random() * 0.2;
        
        const time = new Date(now);
        time.setMinutes(time.getMinutes() - i * 5 - Math.floor(Math.random() * 5));
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-time">${formatTime(time)}</div>
            <div class="history-price ${isBuy ? 'buy' : 'sell'}">${Math.round(price).toLocaleString()}</div>
            <div class="history-amount">${amount.toFixed(4)}</div>
        `;
        
        elements.marketHistoryList.appendChild(historyItem);
    }
}

/**
 * 총 주문 금액 계산
 */
function calculateTotalAmount() {
    const price = Number(elements.priceInput.value.replace(/,/g, '')) || 0;
    const amount = Number(elements.amountInput.value) || 0;
    
    const orderAmount = price * amount;
    const fee = orderAmount * 0.001; // 수수료 0.1%
    const total = orderAmount + fee;
    
    elements.totalOrderAmount.textContent = '₩' + Math.round(orderAmount).toLocaleString();
    elements.feeAmount.textContent = '₩' + Math.round(fee).toLocaleString();
    elements.totalAmount.textContent = '₩' + Math.round(total).toLocaleString();
}

/**
 * 거래 실행
 */
function executeTrade() {
    if (!selectedCoin) {
        showNotification('오류', '거래할 코인을 선택해주세요.', 'error');
        return;
    }
    
    const isBuy = elements.tradeButton.classList.contains('buy');
    const price = Number(elements.priceInput.value.replace(/,/g, '')) || 0;
    const amount = Number(elements.amountInput.value) || 0;
    
    if (price <= 0 || amount <= 0) {
        showNotification('오류', '유효한 가격과 수량을 입력해주세요.', 'error');
        return;
    }
    
    const totalAmount = price * amount;
    const fee = totalAmount * 0.001; // 수수료 0.1%
    const totalCost = totalAmount + fee;
    
    if (isBuy) {
        // 매수 로직
        if (gameState.cash < totalCost) {
            showNotification('잔액 부족', `거래에 필요한 ${totalCost.toLocaleString()}원이 부족합니다.`, 'error');
            return;
        }
        
        // 포트폴리오에 코인 추가
        const existingCoin = gameState.portfolio.crypto.find(coin => coin.id === selectedCoin.id);
        
        if (existingCoin) {
            // 기존 코인 수량 증가
            const totalValue = existingCoin.amount * existingCoin.averagePrice + amount * price;
            existingCoin.amount += amount;
            existingCoin.averagePrice = totalValue / existingCoin.amount;
        } else {
            // 새 코인 추가
            gameState.portfolio.crypto.push({
                id: selectedCoin.id,
                name: selectedCoin.name,
                symbol: selectedCoin.symbol,
                amount: amount,
                averagePrice: price
            });
        }
        
        // 잔액 감소
        gameState.cash -= totalCost;
        
    } else {
        // 매도 로직
        const existingCoin = gameState.portfolio.crypto.find(coin => coin.id === selectedCoin.id);
        
        if (!existingCoin || existingCoin.amount < amount) {
            showNotification('코인 부족', `매도할 ${selectedCoin.name} ${amount} 코인이 부족합니다.`, 'error');
            return;
        }
        
        // 코인 수량 감소
        existingCoin.amount -= amount;
        
        // 잔액 증가
        gameState.cash += totalAmount - fee;
        
        // 수량이 0이면 포트폴리오에서 제거
        if (existingCoin.amount <= 0) {
            gameState.portfolio.crypto = gameState.portfolio.crypto.filter(coin => coin.id !== selectedCoin.id);
        }
    }
    
    // 거래 내역 추가
    const transaction = {
        id: Date.now(),
        type: isBuy ? 'buy' : 'sell',
        coinId: selectedCoin.id,
        coinName: selectedCoin.name,
        price: price,
        amount: amount,
        total: totalAmount,
        fee: fee,
        date: new Date(gameState.currentDate)
    };
    
    gameState.transactions.push(transaction);
    
    // 활동 기록 추가
    gameState.activities.push(`${selectedCoin.name} ${amount} 코인을 ${isBuy ? '매수' : '매도'}했습니다. (₩${Math.round(totalCost).toLocaleString()})`);
    
    // UI 업데이트
    updateBalanceDisplay();
    updatePortfolioDisplay();
    updateTransactionHistory();
    
    showNotification(
        '거래 완료', 
        `${selectedCoin.name} ${amount} 코인을 ${isBuy ? '매수' : '매도'}했습니다.`, 
        'success'
    );
}

/**
 * 포트폴리오 표시 업데이트
 */
function updatePortfolioDisplay() {
    elements.portfolioAssets.innerHTML = '';
    
    // 코인 자산 추가
    let totalValue = 0;
    
    gameState.portfolio.crypto.forEach(coin => {
        const crypto = gameData.cryptocurrencies.find(c => c.id === coin.id);
        if (!crypto) return;
        
        const currentValue = coin.amount * crypto.currentPrice;
        totalValue += currentValue;
        
        const change = ((crypto.currentPrice - coin.averagePrice) / coin.averagePrice) * 100;
        
        const li = document.createElement('li');
        li.className = 'asset-item';
        
        li.innerHTML = `
            <div class="asset-info">
                <div class="coin-icon">${crypto.symbol.charAt(0)}</div>
                <div class="asset-details">
                    <div class="coin-name">${crypto.name}</div>
                    <div class="asset-amount">${coin.amount.toFixed(8)} ${crypto.symbol}</div>
                </div>
            </div>
            <div class="asset-value">
                <div class="asset-price">₩${Math.round(currentValue).toLocaleString()}</div>
                <div class="asset-change ${change >= 0 ? 'positive' : 'negative'}">
                    ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                </div>
            </div>
        `;
        
        elements.portfolioAssets.appendChild(li);
    });
    
    // 현금 자산 추가
    totalValue += gameState.cash;
    
    const cashItem = document.createElement('li');
    cashItem.className = 'asset-item';
    
    cashItem.innerHTML = `
        <div class="asset-info">
            <div class="coin-icon">₩</div>
            <div class="asset-details">
                <div class="coin-name">현금</div>
                <div class="asset-amount">보유 현금</div>
            </div>
        </div>
        <div class="asset-value">
            <div class="asset-price">₩${Math.round(gameState.cash).toLocaleString()}</div>
            <div class="asset-change">0%</div>
        </div>
    `;
    
    elements.portfolioAssets.appendChild(cashItem);
    
    // 총 자산 가치 업데이트
    elements.portfolioTotal.textContent = '₩' + Math.round(totalValue).toLocaleString();
}

/**
 * 거래 내역 업데이트
 */
function updateTransactionHistory() {
    // 최근 10개 거래만 표시
    const recentTransactions = [...gameState.transactions].reverse().slice(0, 10);
    
    elements.orderHistoryList.innerHTML = '';
    
    if (recentTransactions.length === 0) {
        elements.orderHistoryList.innerHTML = '<div class="empty-list">거래 내역이 없습니다.</div>';
        return;
    }
    
    recentTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        li.innerHTML = `
            <div class="history-details">
                <div class="history-type ${transaction.type}">
                    <i class="fas fa-${transaction.type === 'buy' ? 'arrow-down' : 'arrow-up'}"></i>
                    ${transaction.type === 'buy' ? '매수' : '매도'}
                </div>
                <div class="history-date">${formatDateTime(transaction.date)}</div>
            </div>
            <div class="history-value">
                <div class="history-amount">${transaction.amount} ${transaction.coinName}</div>
                <div class="history-price">₩${Math.round(transaction.price).toLocaleString()}</div>
            </div>
        `;
        
        elements.orderHistoryList.appendChild(li);
    });
}

/**
 * 거래 내역 필터링
 */
function filterTransactionHistory(filter) {
    const recentTransactions = [...gameState.transactions].reverse().slice(0, 10);
    
    elements.orderHistoryList.innerHTML = '';
    
    const filteredTransactions = filter === 'all' ? 
        recentTransactions : 
        recentTransactions.filter(t => t.type === filter);
    
    if (filteredTransactions.length === 0) {
        elements.orderHistoryList.innerHTML = '<div class="empty-list">해당하는 거래 내역이 없습니다.</div>';
        return;
    }
    
    filteredTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        li.innerHTML = `
            <div class="history-details">
                <div class="history-type ${transaction.type}">
                    <i class="fas fa-${transaction.type === 'buy' ? 'arrow-down' : 'arrow-up'}"></i>
                    ${transaction.type === 'buy' ? '매수' : '매도'}
                </div>
                <div class="history-date">${formatDateTime(transaction.date)}</div>
            </div>
            <div class="history-value">
                <div class="history-amount">${transaction.amount} ${transaction.coinName}</div>
                <div class="history-price">₩${Math.round(transaction.price).toLocaleString()}</div>
            </div>
        `;
        
        elements.orderHistoryList.appendChild(li);
    });
}

/**
 * 가격 알림 목록 업데이트
 */
function updateAlertsList() {
    elements.priceAlertList.innerHTML = '';
    
    if (gameState.alerts.length === 0) {
        elements.priceAlertList.innerHTML = '<div class="empty-list">설정된 알림이 없습니다.</div>';
        return;
    }
    
    gameState.alerts.forEach(alert => {
        const li = document.createElement('li');
        li.className = 'alert-item';
        li.dataset.id = alert.id;
        
        li.innerHTML = `
            <div class="alert-info">
                <div class="coin-name">${alert.coinName}</div>
                <div class="alert-price">₩${alert.price.toLocaleString()}</div>
                <div class="alert-condition">가격이 ${alert.condition === 'above' ? '이상' : '이하'}일 때</div>
            </div>
            <div class="alert-actions">
                <button class="delete-alert">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        elements.priceAlertList.appendChild(li);
    });
}

/**
 * 날짜 표시 업데이트
 */
function updateDateDisplay() {
    elements.gameDay.textContent = gameState.day;
    elements.gameDate.textContent = formatDate(gameState.currentDate);
}

/**
 * 잔액 표시 업데이트
 */
function updateBalanceDisplay() {
    elements.userBalance.textContent = '₩ ' + Math.round(gameState.cash).toLocaleString();
}

/**
 * 암호화폐 UI 업데이트
 */
function updateCryptoUI() {
    // 코인 목록 업데이트
    document.querySelectorAll('.coin-item').forEach(item => {
        const coinId = item.dataset.id;
        const crypto = gameData.cryptocurrencies.find(c => c.id === coinId);
        
        if (crypto) {
            const changeElement = item.querySelector('.coin-change');
            changeElement.textContent = `${crypto.changePercent >= 0 ? '+' : ''}${crypto.changePercent.toFixed(1)}%`;
            changeElement.className = `coin-change ${crypto.changePercent >= 0 ? 'positive' : 'negative'}`;
        }
    });
    
    // 선택된 코인 정보 업데이트
    if (selectedCoin) {
        const crypto = gameData.cryptocurrencies.find(c => c.id === selectedCoin.id);
        
        if (crypto) {
            elements.currentCoinPrice.textContent = '₩' + Math.round(crypto.currentPrice).toLocaleString();
            
            const changeText = `${crypto.changePercent >= 0 ? '+' : ''}${crypto.changePercent.toFixed(1)}%`;
            elements.currentCoinChange.textContent = changeText;
            elements.currentCoinChange.className = `change ${crypto.changePercent >= 0 ? 'positive' : 'negative'}`;
            
            // 차트 업데이트
            const activeButton = document.querySelector('.chart-options button.active');
            updateChart(activeButton ? activeButton.dataset.period : '1D');
            
            // 호가창 업데이트
            updateOrderBook(crypto);
            
            // 시장 기록 업데이트
            updateMarketHistory(crypto);
        }
    }
}

/**
 * 부동산 UI 업데이트
 */
function updatePropertyUI() {
    // 부동산 목록 초기화
    initPropertyList();
    
    // 소유 부동산 목록 업데이트
    updateOwnedPropertyList();
}

/**
 * 대출 모달 정보 업데이트
 */
function updateLoanModalInfo() {
    document.getElementById('current-loan-amount').textContent = '₩' + Math.round(gameState.loan.amount).toLocaleString();
    document.getElementById('daily-interest-rate').textContent = (gameState.loan.interestRate * 100).toFixed(3) + '%';
    document.getElementById('today-interest').textContent = '₩' + Math.round(gameState.loan.amount * gameState.loan.interestRate).toLocaleString();
    document.getElementById('total-interest').textContent = '₩' + Math.round(gameState.loan.interest).toLocaleString();
    
    // 파산 위험도
    const bankruptcyPercentage = (gameState.loan.interest / 10000000) * 100;
    document.getElementById('bankruptcy-meter').style.width = `${Math.min(bankruptcyPercentage, 100)}%`;
    document.getElementById('bankruptcy-percentage').textContent = `${Math.min(bankruptcyPercentage, 100).toFixed(1)}%`;
    
    // 대출 한도 및 최소 상환액
    const totalAssets = calculateTotalAssets();
    const maxLoan = totalAssets * 0.5;
    document.getElementById('loan-amount').placeholder = `최대 ${Math.round(maxLoan).toLocaleString()}`;
    
    const minRepay = gameState.loan.amount * 0.05;
    document.getElementById('repay-amount').placeholder = `최소 ${Math.round(minRepay).toLocaleString()}`;
}

/**
 * 대출 신청
 */
function applyForLoan() {
    const loanAmount = Number(document.getElementById('loan-amount').value.replace(/,/g, '')) || 0;
    
    if (loanAmount <= 0) {
        showNotification('오류', '유효한 대출 금액을 입력해주세요.', 'error');
        return;
    }
    
    const totalAssets = calculateTotalAssets();
    const maxLoan = totalAssets * 0.5;
    
    if (loanAmount > maxLoan) {
        showNotification('한도 초과', `대출 한도(${Math.round(maxLoan).toLocaleString()}원)를 초과했습니다.`, 'error');
        return;
    }
    
    // 대출 처리
    gameState.loan.amount += loanAmount;
    gameState.cash += loanAmount;
    
    // 활동 기록
    gameState.activities.push(`${loanAmount.toLocaleString()}원을 대출받았습니다.`);
    
    // UI 업데이트
    updateLoanModalInfo();
    updateBalanceDisplay();
    
    showNotification('대출 승인', `${loanAmount.toLocaleString()}원이 계좌에 입금되었습니다.`, 'success');
}

/**
 * 대출 상환
 */
function repayLoan() {
    const repayAmount = Number(document.getElementById('repay-amount').value.replace(/,/g, '')) || 0;
    
    if (repayAmount <= 0) {
        showNotification('오류', '유효한 상환 금액을 입력해주세요.', 'error');
        return;
    }
    
    if (repayAmount > gameState.cash) {
        showNotification('잔액 부족', '상환할 현금이 부족합니다.', 'error');
        return;
    }
    
    const minRepay = gameState.loan.amount * 0.05;
    
    if (repayAmount < minRepay && repayAmount < gameState.loan.amount) {
        showNotification('최소 상환액', `최소 ${Math.round(minRepay).toLocaleString()}원 이상 상환해야 합니다.`, 'error');
        return;
    }
    
    // 이자 먼저 상환
    let remainingAmount = repayAmount;
    const interestPayment = Math.min(remainingAmount, gameState.loan.interest);
    
    if (interestPayment > 0) {
        gameState.loan.interest -= interestPayment;
        remainingAmount -= interestPayment;
    }
    
    // 원금 상환
    const principalPayment = Math.min(remainingAmount, gameState.loan.amount);
    
    if (principalPayment > 0) {
        gameState.loan.amount -= principalPayment;
    }
    
    // 현금 감소
    gameState.cash -= repayAmount;
    
    // 활동 기록
    gameState.activities.push(`대출금 ${repayAmount.toLocaleString()}원을 상환했습니다. (이자: ${interestPayment.toLocaleString()}원, 원금: ${principalPayment.toLocaleString()}원)`);
    
    // UI 업데이트
    updateLoanModalInfo();
    updateBalanceDisplay();
    
    showNotification('대출 상환', `${repayAmount.toLocaleString()}원을 상환했습니다.`, 'success');
}

/**
 * 암호화폐 필터링
 */
function filterCryptos() {
    const searchValue = document.getElementById('crypto-search').value.toLowerCase();
    
    document.querySelectorAll('.coin-item').forEach(item => {
        const coinName = item.querySelector('.coin-name').textContent.toLowerCase();
        const visible = coinName.includes(searchValue);
        item.style.display = visible ? 'flex' : 'none';
    });
}

/**
 * 부동산 필터링
 */
function filterProperties() {
    const searchValue = document.getElementById('property-search').value.toLowerCase();
    const typeFilter = document.getElementById('property-type-filter').value;
    const priceFilter = document.getElementById('price-range-filter').value;
    
    // 사이드바 목록 필터링
    document.querySelectorAll('.property-list .property-item').forEach(item => {
        const property = gameData.properties.find(p => p.id === item.dataset.id);
        if (!property) return;
        
        const nameMatch = property.name.toLowerCase().includes(searchValue);
        const locationMatch = property.location.toLowerCase().includes(searchValue);
        const typeMatch = typeFilter === 'all' || property.type.toLowerCase() === typeFilter;
        
        let priceMatch = true;
        if (priceFilter !== 'all') {
            const [min, max] = priceFilter.split('-').map(Number);
            priceMatch = property.price >= min && property.price <= max;
        }
        
        const visible = (nameMatch || locationMatch) && typeMatch && priceMatch;
        item.style.display = visible ? 'flex' : 'none';
    });
    
    // 그리드 필터링
    document.querySelectorAll('.property-grid .property-card').forEach(card => {
        const property = gameData.properties.find(p => p.id === card.dataset.id);
        if (!property) return;
        
        const nameMatch = property.name.toLowerCase().includes(searchValue);
        const locationMatch = property.location.toLowerCase().includes(searchValue);
        const typeMatch = typeFilter === 'all' || property.type.toLowerCase() === typeFilter;
        
        let priceMatch = true;
        if (priceFilter !== 'all') {
            const [min, max] = priceFilter.split('-').map(Number);
            priceMatch = property.price >= min && property.price <= max;
        }
        
        const visible = (nameMatch || locationMatch) && typeMatch && priceMatch;
        card.style.display = visible ? 'block' : 'none';
    });
}

/**
 * 게임 저장
 */
function saveGame() {
    const saveName = document.getElementById('save-name').value.trim() || `게임_저장_${formatDateForFile(gameState.currentDate)}`;
    
    const saveData = {
        version: '1.0',
        savedAt: new Date(),
        gameState: {
            day: gameState.day,
            currentDate: gameState.currentDate,
            cash: gameState.cash,
            portfolio: gameState.portfolio,
            transactions: gameState.transactions,
            alerts: gameState.alerts,
            loan: gameState.loan,
            prevTotalAssets: gameState.prevTotalAssets,
            maxAssets: gameState.maxAssets
        },
        gameData: {
            cryptocurrencies: gameData.cryptocurrencies.map(crypto => ({
                ...crypto,
                priceHistory: crypto.priceHistory.slice(-30) // 최근 30일 데이터만 저장
            })),
            properties: gameData.properties.filter(property => property.purchased || !property.hidden)
        }
    };
    
    // JSON 데이터 변환
    const jsonData = JSON.stringify(saveData, null, 2);
    
    // 파일 다운로드
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${saveName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 모달 닫기
    elements.saveModal.classList.remove('active');
    
    showNotification('게임 저장', '게임이 성공적으로 저장되었습니다.', 'success');
}

/**
 * 파일 선택 핸들러
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        document.getElementById('selected-file-name').textContent = '선택된 파일 없음';
        document.getElementById('load-file-details').classList.remove('active');
        document.getElementById('confirm-load-btn').disabled = true;
        return;
    }
    
    document.getElementById('selected-file-name').textContent = file.name;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const saveData = JSON.parse(e.target.result);
            
            // 버전 및 필수 데이터 확인
            if (!saveData.version || !saveData.gameState) {
                throw new Error('유효하지 않은 저장 파일입니다.');
            }
            
            // 파일 상세 정보 표시
            document.getElementById('load-game-date').textContent = formatDateTime(new Date(saveData.gameState.currentDate));
            document.getElementById('load-total-assets').textContent = '₩' + calculateTotalAssetsFromSave(saveData).toLocaleString();
            document.getElementById('load-property-count').textContent = saveData.gameState.portfolio.properties.length || '0';
            
            document.getElementById('load-file-details').classList.add('active');
            document.getElementById('confirm-load-btn').disabled = false;
            
            // 파일 데이터를 전역 변수에 임시 저장
            window.tempSaveData = saveData;
            
        } catch (error) {
            console.error('파일 파싱 오류:', error);
            document.getElementById('selected-file-name').textContent = '잘못된 파일 형식';
            document.getElementById('load-file-details').classList.remove('active');
            document.getElementById('confirm-load-btn').disabled = true;
            
            showNotification('파일 오류', '유효하지 않은 저장 파일입니다.', 'error');
        }
    };
    
    reader.readAsText(file);
}

/**
 * 저장 파일에서 총 자산 계산
 */
function calculateTotalAssetsFromSave(saveData) {
    let total = saveData.gameState.cash || 0;
    
    // 암호화폐 자산
    if (saveData.gameState.portfolio && saveData.gameState.portfolio.crypto) {
        saveData.gameState.portfolio.crypto.forEach(coin => {
            const crypto = saveData.gameData.cryptocurrencies.find(c => c.id === coin.id);
            if (crypto && crypto.currentPrice) {
                total += coin.amount * crypto.currentPrice;
            }
        });
    }
    
    // 부동산 자산
    if (saveData.gameData && saveData.gameData.properties) {
        saveData.gameData.properties.forEach(property => {
            if (property.purchased) {
                total += property.currentPrice || property.purchasePrice || property.price;
            }
        });
    }
    
    return total;
}

/**
 * 게임 불러오기
 */
function loadGame() {
    if (!window.tempSaveData) {
        showNotification('오류', '불러올 게임 데이터가 없습니다.', 'error');
        return;
    }
    
    try {
        const saveData = window.tempSaveData;
        
        // 게임 상태 복원
        gameState.day = saveData.gameState.day || 1;
        gameState.currentDate = new Date(saveData.gameState.currentDate);
        gameState.cash = saveData.gameState.cash || 10000000;
        gameState.portfolio = saveData.gameState.portfolio || { crypto: [], properties: [] };
        gameState.transactions = saveData.gameState.transactions || [];
        gameState.alerts = saveData.gameState.alerts || [];
        gameState.loan = saveData.gameState.loan || { amount: 0, interest: 0, interestRate: 0.0005 };
        gameState.prevTotalAssets = saveData.gameState.prevTotalAssets || gameState.cash;
        gameState.maxAssets = saveData.gameState.maxAssets || gameState.cash;
        gameState.lastDayReset = new Date();
        
        // 암호화폐 데이터 복원
        gameData.cryptocurrencies = saveData.gameData.cryptocurrencies || [];
        
        // 부동산 데이터 복원
        if (saveData.gameData.properties) {
            // 기존 부동산 데이터와 병합
            const savedProperties = saveData.gameData.properties;
            
            // 모든 기존 부동산을 hidden으로 표시
            gameData.properties.forEach(property => {
                property.hidden = true;
            });
            
            // 저장된 부동산 정보 적용
            savedProperties.forEach(savedProperty => {
                const existingProperty = gameData.properties.find(p => p.id === savedProperty.id);
                
                if (existingProperty) {
                    // 기존 부동산 업데이트
                    existingProperty.purchased = savedProperty.purchased || false;
                    existingProperty.purchasePrice = savedProperty.purchasePrice;
                    existingProperty.purchaseDate = savedProperty.purchaseDate ? new Date(savedProperty.purchaseDate) : null;
                    existingProperty.currentPrice = savedProperty.currentPrice;
                    existingProperty.tenant = savedProperty.tenant;
                    existingProperty.hidden = false;
                } else {
                    // 신규 부동산 추가
                    gameData.properties.push({
                        ...savedProperty,
                        hidden: false,
                        purchaseDate: savedProperty.purchaseDate ? new Date(savedProperty.purchaseDate) : null
                    });
                }
            });
        }
        // UI 초기화
        initUI();
        
        // 모달 닫기
        elements.loadModal.classList.remove('active');
        elements.introModal.classList.remove('active');
        
        // 게임 타이머 시작
        startGameTimer();
        
        showNotification('게임 불러오기', '게임을 성공적으로 불러왔습니다.', 'success');
        
    } catch (error) {
        console.error('게임 불러오기 오류:', error);
        showNotification('오류', '게임을 불러오는 중 오류가 발생했습니다.', 'error');
    }
    
    // 임시 데이터 삭제
    delete window.tempSaveData;
}

/**
 * 총 자산 계산
 */
function calculateTotalAssets() {
    let total = gameState.cash;
    
    // 암호화폐 자산
    gameState.portfolio.crypto.forEach(coin => {
        const crypto = gameData.cryptocurrencies.find(c => c.id === coin.id);
        if (crypto) {
            total += coin.amount * crypto.currentPrice;
        }
    });
    
    // 부동산 자산
    gameData.properties.forEach(property => {
        if (property.purchased) {
            total += property.currentPrice || property.purchasePrice;
        }
    });
    
    return total;
}

/**
 * 알림 표시
 */
function showNotification(title, message, type = 'info') {
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    
    // 아이콘 설정
    const iconElement = elements.notificationToast.querySelector('.notification-icon i');
    iconElement.className = 'fas';
    
    switch (type) {
        case 'success':
            iconElement.classList.add('fa-check-circle');
            elements.notificationToast.style.borderLeft = '4px solid var(--positive-color)';
            break;
        case 'error':
            iconElement.classList.add('fa-exclamation-circle');
            elements.notificationToast.style.borderLeft = '4px solid var(--negative-color)';
            break;
        case 'warning':
            iconElement.classList.add('fa-exclamation-triangle');
            elements.notificationToast.style.borderLeft = '4px solid var(--warning-color)';
            break;
        default:
            iconElement.classList.add('fa-info-circle');
            elements.notificationToast.style.borderLeft = '4px solid var(--info-color)';
            break;
    }
    
    // 토스트 표시
    elements.notificationToast.classList.add('show');
    
    // 5초 후 자동 닫기
    setTimeout(() => {
        elements.notificationToast.classList.remove('show');
    }, 5000);
}

/**
 * 가격 기록 생성
 */
function generatePriceHistory(basePrice, days) {
    const history = [];
    const now = new Date(gameState.currentDate);
    
    for (let i = days; i > 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const volatility = 0.02; // 2% 변동성
        const change = (Math.random() - 0.5) * volatility * 2;
        
        // 점진적으로 현재 가격에 도달하도록 조정
        const factor = 1 - (i / days); // 0에서 1로 증가
        const adjustedChange = change * (1 - factor) + (factor * 0.0005); // 최종 가격에 약간의 상승 추세
        
        const dailyPrice = basePrice * (1 + adjustedChange);
        
        // 일중 변동 생성
        const open = dailyPrice * (1 + (Math.random() - 0.5) * 0.01);
        const close = dailyPrice * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        const volume = Math.random() * 100;
        
        history.push({
            time: date,
            open,
            high,
            low,
            close,
            volume
        });
    }
    
    return history;
}

/**
 * 날짜 포맷 변환 (YYYY년 MM월 DD일)
 */
function formatDate(date) {
    if (!date) return '';
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 파일명용 날짜 포맷 변환 (YYYYMMDD)
 */
function formatDateForFile(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 날짜 및 시간 포맷 변환 (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTime(date) {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 시간 포맷 변환 (HH:MM:SS)
 */
function formatTime(date) {
    if (!date) return '';
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

// 게임 초기화 및 시작
document.addEventListener('DOMContentLoaded', initGame);

// 캔들스틱 차트 확장 (Chart.js 플러그인)
// Chart.js에 캔들스틱 차트 타입 추가
Chart.defaults.candlestick = Chart.defaults.financial;

class CandlestickController extends Chart.FinancialController {
    static id = 'candlestick';

    draw() {
        super.draw();
        
        const ctx = this.chart.ctx;
        const points = this.getMeta().data;
        
        points.forEach(point => {
            const options = this.resolveDataElementOptions(point.index);
            
            let color = options.borderColor;
            if (point.$context.raw.o >= point.$context.raw.c) {
                color = 'var(--negative-color)'; // 하락봉
            } else {
                color = 'var(--positive-color)'; // 상승봉
            }
            
            ctx.save();
            
            // 몸통 영역
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            
            let width = options.borderWidth;
            let left = point.x - width / 2;
            let right = point.x + width / 2;
            
            // 몸통
            const openY = point.$context.raw.o > point.$context.raw.c ? point.candle.open : point.candle.close;
            const closeY = point.$context.raw.o > point.$context.raw.c ? point.candle.close : point.candle.open;
            
            ctx.fillRect(left, openY, width, closeY - openY);
            
            // 위 심지
            ctx.beginPath();
            ctx.moveTo(point.x, Math.min(openY, closeY));
            ctx.lineTo(point.x, point.candle.high);
            ctx.stroke();
            
            // 아래 심지
            ctx.beginPath();
            ctx.moveTo(point.x, Math.max(openY, closeY));
            ctx.lineTo(point.x, point.candle.low);
            ctx.stroke();
            
            ctx.restore();
        });
    }
}

Chart.register(CandlestickController);

// 캔들스틱 요소 (Chart.js 엘리먼트)
// 간단한 대체 캔들스틱 차트 구현
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        try {
            // 캔들스틱 차트 플러그인 등록 시도
            if (!Chart.controllers.candlestick) {
                Chart.defaults.candlestick = Chart.defaults.financial || {};
                
                class SimpleCandlestickController extends Chart.LineController {
                    static id = 'candlestick';
                    
                    draw() {
                        super.draw();
                        // 간소화된 캔들스틱 렌더링
                    }
                }
                
                Chart.register(SimpleCandlestickController);
            }
        } catch (e) {
            console.warn('캔들스틱 차트 등록 실패:', e);
        }
    }
});

Chart.register(CandlestickElement);
