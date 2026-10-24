/**
 * =====================================================================
 * script.js —— 社死指数评估器 · 业务逻辑层
 * =====================================================================
 *
 * 【文件职责】
 *  本文件是整个应用的大脑，负责：
 *    1. DOM 元素获取与引用缓存
 *    2. 应用状态管理（当前步骤、答案、患者信息）
 *    3. 页面导航（首页 ↔ 测试页 ↔ 结果页 ↔ 历史页）
 *    4. 题目与选项的动态渲染
 *    5. 进度条 / 步骤圆点更新
 *    6. 总分与维度百分比计算（动态适配任意题目分值）
 *    7. 诊断报告生成（含数字滚动动画）
 *    8. 历史记录管理（localStorage 读写）
 *    9. 分享 / 复制 / 打印功能
 *   10. 键盘快捷键与表单校验
 *
 * 【依赖关系】
 *  - 必须先加载 data.js（提供 APP_CONFIG、stepsData、RESULT_LEVELS 等常量）
 *  - 必须在 DOM 就绪后执行（本文件顶层直接注册 DOMContentLoaded）
 *
 * 【设计原则】
 *  - 所有“魔法数字”尽量被消灭，统一从数据/配置中推导；
 *  - 每个函数职责单一、尽量短小，方便阅读与维护；
 *  - 大量中文注释，降低理解成本。
 * =====================================================================
 */

/* =====================================================================
 * 0. 全局诊断与环境检查
 * =====================================================================
 * 启动时打印环境信息，便于排查“数据未加载”等常见问题。
 * =================================================================== */
console.log('🎭 社死评估器脚本加载中...');
console.log('[script.js] 环境检查:', {
    appConfigLoaded: typeof APP_CONFIG !== 'undefined',
    stepsDataLoaded: typeof stepsData !== 'undefined',
    resultLevelsLoaded: typeof RESULT_LEVELS !== 'undefined',
    prescriptsLoaded: typeof PRESCRIPTIONS !== 'undefined'
});

/**
 * 页面入口：等待 DOM 完全加载后再执行所有初始化逻辑。
 * 使用方式：document.addEventListener('DOMContentLoaded', initApp)
 * 之所以不用 window.onload，是因为脚本资源（data.js）在 DOM
 * 解析到 <script> 时即同步阻塞加载，无需额外等待图片等资源。
 */
document.addEventListener('DOMContentLoaded', initApp);

/* =====================================================================
 * 1. 应用主初始化函数
 * =====================================================================
 * 该函数是应用启动的总入口，负责按顺序完成：
 *   a. 缓存 DOM 引用
 *   b. 初始化应用状态
 *   c. 渲染静态 UI（步骤圆点、版本号）
 *   d. 绑定各类事件
 * =================================================================== */
function initApp() {
    console.log('✅ DOM 加载完成，开始初始化应用');

    try {
        // —— 0. 容错自检：确认数据层已完整加载，避免“按钮失效却无报错”的静默失败 ——
        checkDataIntegrity();

        // —— 1. 缓存所有高频使用的 DOM 元素 ——
        cacheDomElements();

        // —— 2. 初始化全局应用状态对象 ——
        initState();

        // —— 3. 执行静态 UI 的首次渲染 ——
        renderInitialUi();

        // —— 4. 初始化扩展功能模块（音效/主题/成就/排行榜/计时器等） ——
        initExtensionModules();

        // —— 5. 绑定所有交互事件 ——
        bindGlobalEvents();

        console.log('🚀 应用初始化完成，等待用户操作...');
    } catch (err) {
        // 任何初始化异常都展示友好提示，避免静默失败
        console.error('❌ 应用初始化失败:', err);
        showFatalError(err);
    }
}

/* =====================================================================
 * 2. DOM 元素缓存
 * =====================================================================
 * 将页面中会反复用到的元素统一缓存到 el 对象，
 * 后续直接通过 el.xxx 访问，避免多次 document.getElementById。
 * =================================================================== */
const el = {};

/**
 * 缓存 DOM 元素引用。
 * 将 index.html 中所有需要交互的元素集中取出。
 */
function cacheDomElements() {
    // —— 页面区块 ——
    el.homePage = document.getElementById('home-page');       // 首页
    el.testPage = document.getElementById('test-page');       // 测试页
    el.resultPage = document.getElementById('result-page');   // 结果页
    el.historyPage = document.getElementById('history-page'); // 历史记录页

    // —— 首页元素 ——
    el.startBtn = document.getElementById('start-btn');           // 开始按钮
    el.ageInput = document.getElementById('patient-age');         // 年龄输入框
    el.ageHint = document.getElementById('age-hint');             // 年龄校验提示
    el.patientForm = document.getElementById('patient-form');     // 患者表单

    // —— 测试页元素 ——
    el.prevBtn = document.getElementById('prev-btn');             // 上一步按钮
    el.nextBtn = document.getElementById('next-btn');             // 下一步按钮
    el.currentStepSpan = document.getElementById('current-step'); // 当前步骤号
    el.stepTitle = document.getElementById('step-title');         // 步骤标题
    el.optionsContainer = document.getElementById('options-container'); // 选项容器
    el.stepDotsContainer = document.getElementById('step-dots');  // 步骤圆点容器
    el.progressFill = document.querySelector('.progress-fill');   // 顶部进度条填充

    // —— 结果页元素 ——
    el.resultContainer = document.querySelector('#result-page .result-container'); // 报告挂载点

    // —— 历史页元素 ——
    el.historyList = document.getElementById('history-list');             // 历史列表容器
    el.clearHistoryBtn = document.getElementById('clear-history-btn');    // 清空历史按钮
    el.backHomeBtn = document.getElementById('back-home-btn');            // 返回首页按钮

    // —— 页脚版本号 ——
    el.footerVersion = document.getElementById('footer-version');

    // —— 扩展功能元素 ——
    el.themeToggle = document.getElementById('theme-toggle');           // 深色模式切换按钮
    el.themeToggleText = document.getElementById('theme-toggle-text');  // 按钮文字
    el.timerDisplay = document.getElementById('timer-display');         // 答题计时器显示
    el.quizCurrent = document.getElementById('quiz-current');           // 当前题号
    el.quizTotal = document.getElementById('quiz-total');               // 总题数
}

/* =====================================================================
 * 3. 应用状态初始化
 * =====================================================================
 * appState 是整个应用的“单一事实来源”，集中管理：
 *   - currentStep ：当前步骤索引（0 表示第 1 步）
 *   - selections  ：用户已选择的答案（key = `step${id}`）
 *   - patientInfo ：患者基本信息（年龄、性别）
 *   - totalScore  ：最终总分
 * =================================================================== */
let appState = {};

/**
 * 初始化（或重置）应用状态。
 * 注意：该函数在首次启动与“重新诊断”时都会被调用。
 */
function initState() {
    appState = {
        // 当前步骤索引（0-based，对应 stepsData 数组下标）
        currentStep: 0,

        // 用户答案：{ step1: {id,text,value}, step2: {...}, ... }
        selections: {},

        // 患者基本信息
        patientInfo: {
            age: 25,   // 默认年龄
            gender: '男' // 默认性别
        },

        // 本轮总分（在“查看结果”时计算并缓存）
        totalScore: 0
    };
}

/* =====================================================================
 * 4. 静态 UI 首次渲染
 * =====================================================================
 * 渲染不依赖用户交互的静态内容：
 *   - 步骤圆点（根据 stepsData 长度动态生成）
 *   - 页脚版本号
 * =================================================================== */
function renderInitialUi() {
    renderStepDots();   // 渲染步骤圆点
    renderFooterVersion(); // 渲染版本号
}

/**
 * 根据 stepsData 动态生成步骤圆点。
 * 好处：以后若题目数量变化，圆点会自动适配，无需改 HTML。
 */
function renderStepDots() {
    // 清空容器（防止重复渲染时叠加）
    el.stepDotsContainer.innerHTML = '';

    // 遍历每一步，创建一个圆点
    stepsData.forEach(function (step, index) {
        const dot = document.createElement('span');
        dot.className = 'step-dot';
        dot.textContent = step.id;          // 圆点内显示步骤编号
        dot.setAttribute('data-step', step.id); // 记录对应步骤号
        dot.title = step.title;             // 悬停显示步骤标题
        el.stepDotsContainer.appendChild(dot);
    });
}

/**
 * 渲染页脚版本号。
 * 从 APP_CONFIG.version 读取，并回退为 '—'。
 */
function renderFooterVersion() {
    if (el.footerVersion) {
        el.footerVersion.textContent = (APP_CONFIG && APP_CONFIG.version) || '—';
    }
}

/* =====================================================================
 * 5. 全局事件绑定
 * =====================================================================
 * 集中绑定所有点击 / 键盘 / 表单事件。
 * =================================================================== */
function bindGlobalEvents() {
    // —— 首页：开始测试 ——
    el.startBtn.addEventListener('click', handleStartTest);

    // —— 测试页：上一步 / 下一步 ——
    el.prevBtn.addEventListener('click', handlePrevStep);
    el.nextBtn.addEventListener('click', handleNextStep);

    // —— 年龄输入框：实时校验 ——
    el.ageInput.addEventListener('input', validateAgeInput);

    // —— 键盘快捷键 ——
    document.addEventListener('keydown', handleKeyboardShortcut);

    // —— 历史页：清空 / 返回首页 ——
    el.clearHistoryBtn.addEventListener('click', handleClearHistory);
    el.backHomeBtn.addEventListener('click', goToHomePage);

    // —— 深色模式切换（由 ThemeManager 模块处理） ——
    if (el.themeToggle) {
        el.themeToggle.addEventListener('click', function () {
            ThemeManager.toggle();
        });
    }

    // —— 选项点击音效（事件委托，兼容动态渲染的 .option 元素） ——
    if (el.optionsContainer) {
        el.optionsContainer.addEventListener('click', handleOptionDelegate);
    }

    // —— 全局按钮点击音效（事件委托，自动忽略禁用按钮） ——
    document.addEventListener('click', handleButtonClickSound);
}

/* =====================================================================
 * 6. 页面导航
 * =====================================================================
 * 应用采用“单页多区块”结构，通过切换 .active 类控制显示。
 * 提供 showPage() 统一处理页面切换。
 * =================================================================== */

/**
 * 切换到指定页面。
 * @param {Element} pageElement - 目标页面 DOM 元素
 * @param {boolean} scrollTop   - 是否滚动回顶部
 */
function showPage(pageElement, scrollTop) {
    // 从所有页面移除 active 类
    [el.homePage, el.testPage, el.resultPage, el.historyPage].forEach(function (page) {
        if (page) page.classList.remove('active');
    });

    // 给目标页面添加 active 类
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // 切换页面后滚动回顶部（居中显示新页面）
    if (scrollTop !== false) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * 返回首页。
 * 用于“返回首页”按钮与测试完成后重新开始。
 */
function goToHomePage() {
    showPage(el.homePage);
}

/**
 * 进入历史记录页（同时刷新列表）。
 */
function goToHistoryPage() {
    renderHistoryList();
    showPage(el.historyPage);
}

/* =====================================================================
 * 7. 首页交互处理
 * ===================================================================== */

/**
 * “开始测试”按钮点击处理。
 * 流程：
 *   1. 读取并校验患者信息（年龄、性别）
 *   2. 校验通过后写入 appState
 *   3. 重置测试状态并进入测试页
 */
function handleStartTest() {
    console.log('🎯 开始按钮被点击');

    // —— 0. 防重复点击：500ms 内只响应一次，避免连点导致重复进入 ——
    if (handleStartTest._lock) return;
    handleStartTest._lock = true;
    setTimeout(function () { handleStartTest._lock = false; }, 500);

    // —— 0.1 播放点击音效 ——
    SoundEngine.click();

    // —— 1. 读取年龄 & 校验 ——
    const age = parseAgeInput();
    if (age === null) {
        // 年龄不合法：显示提示并阻止进入测试
        SoundEngine.error();
        showAgeError();
        return;
    }

    // —— 2. 读取性别 ——
    const gender = readGenderSelection();

    // —— 3. 写入应用状态 ——
    appState.patientInfo.age = age;
    appState.patientInfo.gender = gender;
    console.log('📋 患者信息已记录:', appState.patientInfo);

    // —— 4. 重置测试进度（清空旧答案） ——
    resetTestProgress();

    // —— 4.1 启动答题计时器 ——
    TimerManager.start();

    // —— 5. 进入测试页并渲染第 1 步 ——
    showPage(el.testPage);
    renderStep();
}

/**
 * 解析年龄输入框的值。
 * @returns {number|null} 合法年龄返回数字，否则返回 null
 *
 * 解析规则：
 *   - 去掉首尾空格；
 *   - 为空则默认 25（看作未填写，使用默认值）；
 *   - 非数字 或 小数 或 超出 1~120，返回 null（要求重新输入）。
 */
function parseAgeInput() {
    const raw = el.ageInput.value.trim();

    // 空输入：认为用户想用默认值，返回默认年龄
    if (raw === '') {
        return APP_CONFIG.ageDefault || 25;
    }

    const age = Number(raw);

    // 非数字
    if (!Number.isFinite(age)) return null;

    // 必须为整数
    if (!Number.isInteger(age)) return null;

    // 必须在 1 ~ 120 之间
    if (age < 1 || age > 120) return null;

    return age;
}

/**
 * 读取当前选中的性别。
 * @returns {string} 选中的性别值，默认 '男'
 */
function readGenderSelection() {
    const checked = document.querySelector('input[name="gender"]:checked');
    return checked ? checked.value : '男';
}

/**
 * 显示年龄输入错误提示。
 * 为输入框添加错误样式、显示提示文字，并把焦点移回输入框。
 */
function showAgeError() {
    // 高亮输入框（临时添加 error 类，1.5s 后移除）
    el.ageInput.classList.add('input-error');
    el.ageHint.classList.add('show');

    // 聚焦到输入框，方便用户直接重新输入
    el.ageInput.focus();

    // 1.5 秒后自动移除错误样式（保留提示，待用户重新输入时清除）
    setTimeout(function () {
        el.ageInput.classList.remove('input-error');
    }, 1500);
}

/**
 * 年龄输入框的实时校验。
 * 当用户开始重新输入时，自动清除错误提示。
 */
function validateAgeInput() {
    // 只要用户再次输入，就隐藏错误提示
    el.ageHint.classList.remove('show');
    el.ageInput.classList.remove('input-error');

    // 实时给出轻提示：如果当前输入明显越界，边框变红
    const age = Number(el.ageInput.value.trim());
    if (el.ageInput.value.trim() !== '' && (!Number.isInteger(age) || age < 1 || age > 120)) {
        el.ageInput.style.borderColor = 'var(--color-danger)';
    } else {
        el.ageInput.style.borderColor = '';
    }
}

/**
 * 重置测试进度。
 * 清空所有已选答案、总分，并回到第 0 步。
 * 注意：不清空 patientInfo，保留患者信息（用于报告展示）。
 */
function resetTestProgress() {
    appState.currentStep = 0;
    appState.totalScore = 0;
    appState.selections = {};
}

/* =====================================================================
 * 8. 测试页：题目渲染
 * ===================================================================== */

/**
 * 渲染当前步骤（核心函数）。
 * 根据 appState.currentStep 找到对应题目，渲染：
 *   - 步骤号 / 标题 / 说明
 *   - 选项网格
 *   - 上一步/下一步按钮状态
 * 并调用 updateProgress 更新进度条。
 */
function renderStep() {
    const step = stepsData[appState.currentStep];
    if (!step) {
        console.warn('⚠️ 未找到当前步骤数据，步骤索引:', appState.currentStep);
        return;
    }

    // —— 1. 更新步骤号与标题 ——
    el.currentStepSpan.textContent = step.id;
    el.stepTitle.innerHTML =
        '第' + step.id + '步：' + step.title +
        '<br><small>' + step.description + '</small>';

    // —— 1.1 同步“第 X / Y 题”指示（扩展功能） ——
    if (el.quizCurrent) el.quizCurrent.textContent = step.id;
    if (el.quizTotal) el.quizTotal.textContent = stepsData.length;

    // —— 2. 更新按钮状态 ——
    // 上一步：首步时禁用
    el.prevBtn.disabled = (appState.currentStep === 0);

    // 下一步：最后一步显示“查看结果”，且必须已选答案才可点击
    const isLastStep = (appState.currentStep === stepsData.length - 1);
    el.nextBtn.innerHTML = isLastStep
        ? '查看结果 <i class="fas fa-chart-pie"></i>'
        : '下一步 <i class="fas fa-arrow-right"></i>';

    // 若当前步已有答案，则“下一步”可用；否则禁用
    const stepKey = 'step' + step.id;
    el.nextBtn.disabled = !appState.selections[stepKey];

    // —— 3. 渲染选项 ——
    renderOptions(step);

    // —— 4. 更新进度 ——
    updateProgress();
}

/**
 * 渲染当前步骤的所有选项。
 * @param {Object} step - 当前步骤数据对象
 */
function renderOptions(step) {
    // 清空旧选项
    el.optionsContainer.innerHTML = '';

    // 当前步骤的答案 key（如 step1、step2...）
    const stepKey = 'step' + step.id;

    // 遍历每个选项，创建选项卡片
    step.options.forEach(function (option) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';

        // 判断该选项是否为当前已选答案
        const isSelected = appState.selections[stepKey] &&
            appState.selections[stepKey].id === option.id;

        if (isSelected) {
            optionDiv.classList.add('selected');
        }

        // 填充选项内容（emoji + 文字 + 分值）
        optionDiv.innerHTML =
            '<span class="option-emoji">' + option.emoji + '</span>' +
            '<div class="option-title">' + option.text + '</div>' +
            '<span class="option-score">+' + option.value + '分</span>';

        // 绑定点击事件（使用闭包捕获当前 option 与 step）
        optionDiv.addEventListener('click', function () {
            selectOption(step, option, optionDiv);
        });

        el.optionsContainer.appendChild(optionDiv);
    });
}

/**
 * 选中某个选项。
 * @param {Object} step      - 当前步骤数据
 * @param {Object} option    - 被选中的选项数据
 * @param {Element} optionDiv - 被选中的选项 DOM 元素
 */
function selectOption(step, option, optionDiv) {
    // 1. 移除所有选项的选中态
    el.optionsContainer.querySelectorAll('.option').forEach(function (opt) {
        opt.classList.remove('selected');
    });

    // 2. 给当前选项添加选中态
    optionDiv.classList.add('selected');

    // 3. 记录答案
    appState.selections['step' + step.id] = {
        id: option.id,
        text: option.text,
        value: option.value
    };

    // 4. 启用下一步按钮
    el.nextBtn.disabled = false;

    // 5. 可选：自动聚焦下一步（提升键盘操作体验，但避免打断移动端）
    //    这里不做强制聚焦，保留手动点击/按键灵活性。
}

/**
 * 更新进度条与步骤圆点。
 * 进度条填充比例 = (当前步骤 + 1) / 总步骤数。
 * 圆点状态：
 *   - 已走过的步骤：completed
 *   - 当前步骤：active
 *   - 未走的步骤：默认样式
 */
function updateProgress() {
    const totalSteps = stepsData.length;

    // —— 更新顶部进度条 ——
    if (el.progressFill) {
        const percent = ((appState.currentStep + 1) / totalSteps) * 100;
        el.progressFill.style.width = percent + '%';
    }

    // —— 更新步骤圆点 ——
    const dots = el.stepDotsContainer.querySelectorAll('.step-dot');
    dots.forEach(function (dot, index) {
        // 先清空所有状态类
        dot.classList.remove('active', 'completed');

        if (index < appState.currentStep) {
            // 已完成：显示勾号，绿色完成态
            dot.classList.add('completed');
            dot.textContent = '✓';
        } else if (index === appState.currentStep) {
            // 当前步骤：高亮放大
            dot.classList.add('active');
            dot.textContent = stepsData[index].id;
        } else {
            // 未开始：显示步骤编号
            dot.textContent = stepsData[index].id;
        }
    });
}

/* =====================================================================
 * 9. 测试页：导航处理
 * ===================================================================== */

/**
 * “上一步”按钮处理。
 * 仅当前步骤 > 0 时向上回退一步。
 */
function handlePrevStep() {
    if (appState.currentStep > 0) {
        appState.currentStep--;
        renderStep();
    }
}

/**
 * “下一步”按钮处理。
 * 若当前不是最后一步，则前进；否则进入结果页。
 */
function handleNextStep() {
    console.log('➡️ 下一步按钮被点击，当前步骤:', appState.currentStep);

    // 安全防护：未选择答案时不允许前进
    const stepKey = 'step' + stepsData[appState.currentStep].id;
    if (!appState.selections[stepKey]) {
        console.warn('⚠️ 当前步骤尚未选择答案，拒绝前进');
        return;
    }

    if (appState.currentStep < stepsData.length - 1) {
        // 前进到下一步
        appState.currentStep++;
        renderStep();
    } else {
        // 最后一步：展示结果
        console.log('🎉 所有题目完成，进入结果页');
        showResult();
    }
}

/* =====================================================================
 * 10. 分数计算
 * ===================================================================== */

/**
 * 计算总分。
 * 遍历每个步骤的已选答案，累加各选项分值。
 * @returns {number} 总分
 */
function calculateTotalScore() {
    let total = 0;

    // 遍历所有步骤（按 id 从 1 到 stepsData.length）
    stepsData.forEach(function (step) {
        const key = 'step' + step.id;
        if (appState.selections[key]) {
            total += appState.selections[key].value;
        }
    });

    appState.totalScore = total;
    return total;
}

/**
 * 计算理论满分（动态）。
 * 满分 = 每题“最大分值选项”之和。
 * 用于把总分换算成百分比，使等级划分不受题目分值影响。
 * @returns {number} 理论满分
 */
function calculateMaxScore() {
    let max = 0;

    stepsData.forEach(function (step) {
        // 找出该步骤所有选项中的最大 value
        let stepMax = 0;
        step.options.forEach(function (option) {
            if (option.value > stepMax) stepMax = option.value;
        });
        max += stepMax;
    });

    // 防止除零
    return max > 0 ? max : 1;
}

/**
 * 计算总分的百分比（0 ~ 100）。
 * 百分比 = (总分 / 满分) * 100，向下取整并限制在 0~100。
 * @returns {number} 百分比
 */
function calculatePercentage() {
    const score = calculateTotalScore();
    const max = calculateMaxScore();
    const pct = Math.floor((score / max) * 100);
    return Math.max(0, Math.min(100, pct));
}

/**
 * 计算各维度百分比。
 * 每个步骤对应一个维度，维度百分比 = (该步所选分值 / 该步最大分值) * 100。
 * @returns {Object} 形如 { scene: 60, people: 80, ... } 的维度对象
 */
function calculateDimensionPercentages() {
    const dimensions = {};

    // 遍历 DIMENSIONS，为每个维度初始化为 0
    DIMENSIONS.forEach(function (dim) {
        dimensions[dim.key] = 0;
    });

    // 遍历每个步骤，将答案映射到对应维度
    stepsData.forEach(function (step, index) {
        const key = 'step' + step.id;
        const dim = DIMENSIONS[index];
        if (!dim) return; // 维度不存在则跳过（防御）

        if (appState.selections[key]) {
            const value = appState.selections[key].value;

            // 计算该步骤的最大分值
            let stepMax = 0;
            step.options.forEach(function (opt) {
                if (opt.value > stepMax) stepMax = opt.value;
            });
            if (stepMax === 0) stepMax = 1; // 防除零

            const pct = Math.floor((value / stepMax) * 100);
            dimensions[dim.key] = Math.max(0, Math.min(100, pct));
        }
    });

    return dimensions;
}

/* =====================================================================
 * 11. 结果等级匹配
 * ===================================================================== */

/**
 * 根据百分比获取结果等级（RESULT_LEVELS 中的一项）。
 * @param {number} pct - 百分比（0~100）
 * @returns {Object} 匹配到的等级对象
 */
function getResultLevel(pct) {
    // 遍历等级列表，找到百分比落在其区间内的等级
    for (let i = 0; i < RESULT_LEVELS.length; i++) {
        const level = RESULT_LEVELS[i];
        if (pct >= level.minPct && pct <= level.maxPct) {
            return level;
        }
    }
    // 兜底：返回第一个等级（理论上不会走到这里）
    return RESULT_LEVELS[0];
}

/**
 * 根据等级 key 获取诊断结论详情（DIAGNOSIS_RESULTS 中的一项）。
 * @param {string} levelKey - 等级 key（mild/moderate/severe/critical）
 * @returns {Object} 诊断结论对象
 */
function getDiagnosisByKey(levelKey) {
    for (let i = 0; i < DIAGNOSIS_RESULTS.length; i++) {
        if (DIAGNOSIS_RESULTS[i].key === levelKey) {
            return DIAGNOSIS_RESULTS[i];
        }
    }
    return DIAGNOSIS_RESULTS[0];
}

/**
 * 根据等级 key 随机获取一剂药方。
 * @param {string} levelKey - 等级 key
 * @returns {Object} 药方对象 { name, usage }
 */
function getPrescription(levelKey) {
    // 防御：若药方库没有该等级，回退到 mild
    const list = PRESCRIPTIONS[levelKey] || PRESCRIPTIONS.mild;
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * 根据等级 key 随机获取一条毒舌点评。
 * @param {string} levelKey - 等级 key
 * @returns {string} 毒舌点评文案
 */
function getSnarkyComment(levelKey) {
    const list = SNARKY_COMMENTS[levelKey] || SNARKY_COMMENTS.mild;
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * 随机获取一个社死剧本案例。
 * @returns {Object} 案例对象 { title, humorDesc, snarkyComment, score }
 */
function getRandomScript() {
    return socialDeathScripts[Math.floor(Math.random() * socialDeathScripts.length)];
}

/* =====================================================================
 * 12. 随机文案生成工具
 * ===================================================================== */

/**
 * 从数组中随机取一个元素。
 * @param {Array} arr - 任意数组
 * @returns {*} 随机元素
 */
function randomPick(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成病历号。
 * 格式：YYYYMMDD-XXX（年月日 + 3 位随机数）。
 * @returns {string} 病历号
 */
function generateCaseNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return year + month + day + '-' + random;
}

/**
 * 获取当前时间的本地化字符串（含日期与时分）。
 * @returns {string} 如 "2024/08/24 10:30"
 */
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 获取当前日期字符串。
 * @returns {string} 如 "2024/8/24"
 */
function getCurrentDate() {
    return new Date().toLocaleDateString('zh-CN');
}

/**
 * 获取随机患者姓名。
 * @returns {string}
 */
function getRandomName() {
    return randomPick(NAME_POOL);
}

/**
 * 获取随机医生姓氏 + 医师。
 * @returns {string} 如 "Dr. 尴尬"
 */
function getRandomDoctor() {
    return randomPick(DOCTOR_POOL);
}

/**
 * 获取随机医嘱。
 * @returns {string}
 */
function getRandomAdvice() {
    return randomPick(ADVICE_POOL);
}

/**
 * 获取随机分享文案。
 * @returns {string}
 */
function getRandomShareText() {
    return randomPick(SHARE_TEXT_POOL);
}

/* =====================================================================
 * 13. 结果页展示
 * ===================================================================== */

/**
 * 展示结果页。
 * 计算分数 → 切换页面 → 生成报告 → 启动数字动画 → 保存历史。
 */
function showResult() {
    // 保存本轮百分比（供报告与分享复用）
    const percentage = calculatePercentage();

    // 停止计时器并记录本轮用时（供“速通大师”成就判定）
    TimerManager.stop();
    const elapsed = TimerManager.getElapsedSeconds();

    // 切换到结果页
    showPage(el.resultPage);

    // 生成诊断报告 HTML（内部会保存历史记录）
    generateDiagnosisReport(percentage);

    // 获取结果等级，供增强渲染复用
    const level = getResultLevel(percentage);

    // 成功音效 + 彩带庆祝（危重等级放更多彩带）
    SoundEngine.success();
    ConfettiSystem.launch(percentage >= 86 ? 160 : 80);

    // 成就判定（必须在排行榜/徽章渲染之前，确保本次新解锁立即可见）
    AchievementSystem.checkAll(percentage, elapsed);

    // 写入本地排行榜（必须在渲染排行榜之前，确保本次成绩上榜）
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableLeaderboard) {
        Leaderboard.add({
            name: appState.patientInfo.gender + '·' + (appState.patientInfo.age || '?') + '岁',
            score: percentage,
            level: level ? level.severity : '',
            time: new Date().toLocaleString()
        });
    }

    // 最后渲染扩展内容：雷达图 / 成就徽章 / 排行榜 / 分享卡片
    renderResultEnhancements(percentage, level);
}

/**
 * 生成并渲染诊断报告。
 * @param {number} percentage - 综合百分比（0~100）
 */
function generateDiagnosisReport(percentage) {
    const score = appState.totalScore;
    const dimensions = calculateDimensionPercentages();
    const level = getResultLevel(percentage);
    const diagnosis = getDiagnosisByKey(level.key);
    const prescription = getPrescription(level.key);
    const snarky = getSnarkyComment(level.key);
    const script = getRandomScript();
    const maxScore = calculateMaxScore();

    // 组装报告 HTML
    el.resultContainer.innerHTML =
        '<div class="diagnosis-report">' +

            // —— 报告头部 ——
            '<div class="report-header">' +
                '<div class="hospital-info">' +
                    '<h2><i class="fas fa-hospital"></i> ' + APP_CONFIG.hospitalName + '</h2>' +
                    '<div class="hospital-details">' +
                        '<p>病历号：SD' + generateCaseNumber() + '</p>' +
                        '<p>就诊时间：' + getCurrentTime() + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // —— 患者信息 ——
            '<div class="patient-info">' +
                '<h3><i class="fas fa-user-injured"></i> 患者信息</h3>' +
                '<div class="info-grid">' +
                    buildInfoItem('姓名', getRandomName()) +
                    buildInfoItem('性别', appState.patientInfo.gender) +
                    buildInfoItem('年龄', appState.patientInfo.age + '岁') +
                    buildInfoItem('主诉', '突发性社会死亡，伴持续性尴尬发作') +
                '</div>' +
            '</div>' +

            // —— 检查结果 ——
            '<div class="examination-results">' +
                '<h3><i class="fas fa-stethoscope"></i> 检查结果</h3>' +

                // 综合指数环形图
                '<div class="overall-score">' +
                    '<div class="score-circle">' +
                        '<div class="circle-progress" style="--progress: ' + percentage + '%">' +
                            '<span class="percentage" id="percentage-text">0%</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="score-label">综合尴尬指数</div>' +
                '</div>' +

                // 各维度分析
                '<div class="dimension-analysis">' +
                    '<h4><i class="fas fa-chart-bar"></i> 各维度分析</h4>' +
                    '<div class="dimension-grid">' +
                        buildDimensionItem('场合尴尬', dimensions.scene) +
                        buildDimensionItem('人物尴尬', dimensions.people) +
                        buildDimensionItem('行为尴尬', dimensions.action) +
                        buildDimensionItem('补救尴尬', dimensions.solution) +
                    '</div>' +
                '</div>' +
            '</div>' +

            // —— 诊断结论 ——
            '<div class="diagnosis-conclusion">' +
                '<h3><i class="fas fa-file-medical-alt"></i> 诊断结论</h3>' +
                '<div class="conclusion-card ' + diagnosis.level + '">' +
                    '<div class="diagnosis-badge">' +
                        '<span class="badge-icon">' + diagnosis.icon + '</span>' +
                        '<h4>' + level.title + '</h4>' +
                    '</div>' +
                    '<div class="diagnosis-details">' +
                        '<p><strong>诊断名称：</strong>' + diagnosis.title + '</p>' +
                        '<p><strong>诊断依据：</strong>' + diagnosis.basisText + '</p>' +
                        '<p><strong>严重程度：</strong>' + diagnosis.severity + '</p>' +
                        '<p><strong>综合得分：</strong>' + score + ' / ' + maxScore + '（' + percentage + '%）</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // —— 毒舌点评（彩蛋） ——
            '<div class="snarky-comment">' + snarky + '</div>' +

            // —— 治疗预案 ——
            '<div class="treatment-plan">' +
                '<h3><i class="fas fa-prescription-bottle-alt"></i> 治疗方案</h3>' +
                '<div class="prescription">' +
                    '<div class="medicine-list">' +
                        '<div class="medicine-item">' +
                            '<span class="medicine-name">' + prescription.name + '</span>' +
                            '<span class="medicine-dosage">' + prescription.usage + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="doctor-advice">' +
                        '<p><strong>医嘱：</strong>' + getRandomAdvice() + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // —— 同类经典案例 ——
            '<div class="examination-results">' +
                '<h3><i class="fas fa-book-open"></i> 同类经典社死案例</h3>' +
                '<div class="conclusion-card" style="border-color:#17a2b8">' +
                    '<div class="diagnosis-details">' +
                        '<p><strong>案例：</strong>' + script.title + '</p>' +
                        '<p><strong>经过：</strong>' + script.humorDesc + '</p>' +
                        '<p><strong>点评：</strong>' + script.snarkyComment + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // —— 医生签名 ——
            '<div class="doctor-signature">' +
                '<div class="signature-box">' +
                    '<p>主治医师：<span class="doctor-name">Dr. ' + getRandomDoctor() + '</span></p>' +
                    '<div class="signature-line"></div>' +
                    '<p class="signature-date">' + getCurrentDate() + '</p>' +
                '</div>' +
            '</div>' +

            // —— 操作按钮 ——
            '<div class="report-actions">' +
                '<button id="poster-btn" class="btn-primary" type="button"><i class="fas fa-image" aria-hidden="true"></i> 生成分享海报</button>' +
                '<button id="restart-btn" class="btn-primary"><i class="fas fa-redo"></i> 重新诊断</button>' +
                '<button id="history-btn" class="btn-secondary"><i class="fas fa-history"></i> 查看病史</button>' +
                '<button id="share-btn" class="btn-secondary"><i class="fas fa-share-alt"></i> 分享病历</button>' +
                '<button id="copy-link-btn" class="btn-secondary"><i class="fas fa-link"></i> 复制链接</button>' +
                '<button id="print-btn" class="btn-secondary"><i class="fas fa-print"></i> 打印报告</button>' +
            '</div>' +

            // —— 免责声明 ——
            '<div class="disclaimer">' +
                '<p><i class="fas fa-exclamation-triangle"></i>' + APP_CONFIG.disclaimer + '</p>' +
            '</div>' +

        '</div>';

    // 绑定结果页动态按钮事件
    bindResultPageEvents();

    // 启动百分比数字滚动动画
    animatePercentage(percentage);

    // 保存本轮结果到历史记录
    saveHistory(percentage, level);
}

/**
 * 构建“患者信息”单个条目 HTML。
 * @param {string} label - 标签
 * @param {string} value - 值
 * @returns {string} 条目 HTML
 */
function buildInfoItem(label, value) {
    return '<div class="info-item">' +
        '<span class="info-label">' + label + '</span>' +
        '<span class="info-value">' + value + '</span>' +
    '</div>';
}

/**
 * 构建“维度分析”单个条目 HTML。
 * @param {string} name - 维度名称
 * @param {number} value - 维度百分比
 * @returns {string} 条目 HTML
 */
function buildDimensionItem(name, value) {
    return '<div class="dimension-item">' +
        '<div class="dimension-header">' +
            '<span class="dimension-name">' + name + '</span>' +
            '<span class="dimension-value">' + value + '%</span>' +
        '</div>' +
        '<div class="progress-bar">' +
            '<div class="progress-fill" style="width: ' + value + '%"><span></span></div>' +
        '</div>' +
    '</div>';
}

/**
 * 绑定结果页动态生成的按钮事件。
 * 由于结果页按钮是在报告 HTML 注入后才存在，
 * 必须在注入完成后重新查询并绑定。
 */
function bindResultPageEvents() {
    document.getElementById('poster-btn').addEventListener('click', openResultPoster);
    // 重新诊断
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', handleRestart);
    }

    // 查看病史
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', goToHistoryPage);
    }

    // 分享病历
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }

    // 复制链接
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', handleCopyLink);
    }

    // 打印报告
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            window.print();
        });
    }
}

/**
 * “重新诊断”处理。
 * 清空答案与状态，回到首页重新开始。
 */
function handleRestart() {
    resetTestProgress();
    showPage(el.homePage);
}

/**
 * 百分比数字滚动动画。
 * 用 requestAnimationFrame 从 0 递增到目标百分比，
 * 配合 CSS 环形图渐变呈现滚动效果。
 * @param {number} targetPct - 目标百分比（0~100）
 */
function animatePercentage(targetPct) {
    const textEl = document.getElementById('percentage-text');
    if (!textEl) return;

    const startTime = performance.now();
    const duration = APP_CONFIG.countUpAnimationMs || 1000;

    // 动画帧更新函数
    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1); // 0~1

        // 缓出（easeOutCubic）：先快后慢
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * targetPct);

        textEl.textContent = current + '%';

        // 未完成则继续请求下一帧
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            // 动画结束，确保显示精确值
            textEl.textContent = targetPct + '%';
        }
    }

    requestAnimationFrame(step);
}

/* =====================================================================
 * 14. 历史记录管理
 * =====================================================================
 * 使用 localStorage 持久化历史测试结果。
 * 数据结构：保存在 APP_CONFIG.storageKey 下的 JSON 数组：
 *   [
 *     { time, percentage, levelKey, title, emoji, score },
 *     ...
 *   ]
 * =================================================================== */

/**
 * 读取历史记录。
 * @returns {Array} 历史记录数组（无则返回空数组）
 */
function readHistory() {
    // 若未启用 localStorage，则返回空数组
    if (!APP_CONFIG.enableLocalStorage) return [];

    try {
        const raw = localStorage.getItem(APP_CONFIG.storageKey);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn('⚠️ 读取历史记录失败:', err);
        return [];
    }
}

/**
 * 保存一条历史记录。
 * @param {number} percentage - 综合百分比
 * @param {Object} level      - 结果等级对象
 */
function saveHistory(percentage, level) {
    if (!APP_CONFIG.enableLocalStorage) return;

    const history = readHistory();

    // 在数组头部插入新纪录（最新的排最前）
    history.unshift({
        time: getCurrentTime(),
        percentage: percentage,
        score: appState.totalScore,
        levelKey: level.key,
        title: level.title,
        emoji: level.emoji
    });

    // 限制最大条数
    if (history.length > APP_CONFIG.historyMaxCount) {
        history.length = APP_CONFIG.historyMaxCount;
    }

    try {
        localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(history));
        console.log('💾 历史记录已保存，当前共', history.length, '条');
    } catch (err) {
        console.warn('⚠️ 保存历史记录失败:', err);
    }
}

/**
 * 渲染历史记录列表。
 * 若无记录则显示空状态。
 */
function renderHistoryList() {
    const history = readHistory();

    if (history.length === 0) {
        el.historyList.innerHTML =
            '<div class="history-empty">' +
                '<i class="fas fa-clipboard-list"></i>' +
                '<p>暂无检测记录，快去完成一次社死评估吧！</p>' +
            '</div>';
        return;
    }

    // 构建列表 HTML
    let html = '';
    history.forEach(function (item) {
        html +=
            '<div class="history-item">' +
                '<span class="history-emoji">' + item.emoji + '</span>' +
                '<div class="history-info">' +
                    '<div class="history-title">' + item.title + '</div>' +
                    '<div class="history-meta">' +
                        '<span><i class="far fa-clock"></i> ' + item.time + '</span>' +
                        '<span><i class="fas fa-star"></i> 得分 ' + item.score + '</span>' +
                    '</div>' +
                '</div>' +
                '<span class="history-score">' + item.percentage + '%</span>' +
            '</div>';
    });

    el.historyList.innerHTML = html;
}

/**
 * “清空病史”处理。
 * 删除 localStorage 中的历史记录并刷新列表。
 */
function handleClearHistory() {
    if (APP_CONFIG.enableLocalStorage) {
        localStorage.removeItem(APP_CONFIG.storageKey);
    }
    renderHistoryList();
    console.log('🗑️ 历史记录已清空');
}

/* =====================================================================
 * 15. 分享功能与 Toast 轻提示
 * ===================================================================== */

/**
 * 显示 Toast 轻提示（替代原生 alert，体验更佳）。
 * 若无容器则动态创建，支持 success / error / info 三种类型。
 * @param {string} message - 提示文案
 * @param {string} type    - 提示类型：success / error / info
 */
function showToast(message, type) {
    // —— 查找或动态创建 toast 容器 ——
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // —— 创建单条 toast ——
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');

    // —— 根据类型选择图标 ——
    const iconMap = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    const icon = iconMap[type] || iconMap.info;

    toast.innerHTML =
        '<span class="toast-icon">' + icon + '</span>' +
        '<span class="toast-msg">' + message + '</span>';

    container.appendChild(toast);

    // —— 2.5 秒后自动淡出并移除 ——
    setTimeout(function () {
        toast.classList.add('hide');

        // 监听动画结束事件，移除节点（CSS 使用 animation，故监听 animationend）
        toast.addEventListener('animationend', function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });

        // 兜底移除（防止个别浏览器不触发 transitionend）
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, 2500);
}

/**
 * 获取可用于分享的 URL。
 * 只有 http / https 协议适合分享；file:// 等本地协议无意义，返回空串。
 * @returns {string} 可分享的 URL（可能为空字符串）
 */
function getShareableUrl() {
    const protocol = window.location.protocol;
    if (protocol === 'http:' || protocol === 'https:') {
        return window.location.href;
    }
    return '';
}

/**
 * 分享病历处理。
 * 优先使用 Web Share API（移动端 / 部分桌面端）；
 * 不支持时降级为“复制到剪贴板”。
 */
function handleShare() {
    const percentage = calculatePercentage();
    const shareText =
        getRandomShareText() +
        ' 我的综合尴尬指数达 ' + percentage + '%！';
    const shareUrl = getShareableUrl();

    // —— 方案一：原生分享 API（支持时最优雅） ——
    if (navigator.share) {
        const shareData = {
            title: APP_CONFIG.appName,
            text: shareText
        };
        // 仅当存在可分享链接时才附带 url（避免 file:// 无意义链接）
        if (shareUrl) shareData.url = shareUrl;

        navigator.share(shareData).then(function () {
            showToast('分享成功，感谢传播社死！', 'success');
        }).catch(function (err) {
            // 用户取消分享不属于错误，忽略；其他错误则降级为复制
            if (err && err.name !== 'AbortError') {
                console.warn('⚠️ 分享失败，降级为复制:', err);
                copyToClipboard(shareText + (shareUrl ? '\n' + shareUrl : ''));
            }
        });
        return;
    }

    // —— 方案二：复制到剪贴板 ——
    copyToClipboard(shareText + (shareUrl ? '\n' + shareUrl : ''));
}

/**
 * “复制链接”处理。
 * 仅复制当前页面链接（含引导文案），方便转发给好友。
 */
function handleCopyLink() {
    const shareUrl = getShareableUrl();

    // 本地打开时无有效链接，给出提示
    if (!shareUrl) {
        showToast('当前为本地打开，暂无有效链接', 'info');
        return;
    }

    copyToClipboard(
        '【' + APP_CONFIG.appName + '】快来测测你的尴尬能绕地球几圈：\n' + shareUrl
    );
}

/**
 * 复制文本到剪贴板。
 * @param {string} text - 要复制的文本
 */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            showToast('诊断报告已复制，快去分享吧！', 'success');
        }).catch(function () {
            // 剪贴板 API 失败时，使用传统 execCommand 兜底
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

/**
 * 复制降级方案（旧浏览器 / 非安全上下文环境，如 file:// 本地打开）。
 * @param {string} text - 要复制的文本
 */
function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        if (!document.execCommand('copy')) {
            throw new Error('浏览器未能复制内容');
        }
        showToast('诊断报告已复制，快去分享吧！', 'success');
    } catch (err) {
        showToast('复制失败，请手动复制内容', 'error');
        console.warn('⚠️ 复制失败:', err);
    }
    document.body.removeChild(textarea);
}

/* =====================================================================
 * 16. 键盘快捷键
 * =====================================================================
 * 在测试页激活时，支持：
 *   - ← 方向键：上一步
 *   - → 方向键：下一步
 *   - 数字键 1~N：选择对应选项
 *
 * 注意：当焦点位于输入框、文本域等可输入元素时，忽略快捷键，
 * 避免干扰正常输入（修复原版中键盘监听与输入框冲突的 bug）。
 * =================================================================== */
function handleKeyboardShortcut(e) {
    // 只在测试页激活时处理
    if (!el.testPage.classList.contains('active')) return;

    // 若焦点在输入控件上，忽略快捷键
    if (isTypingElement(document.activeElement)) return;

    // 左方向键：上一步
    if (e.key === 'ArrowLeft' && !el.prevBtn.disabled) {
        e.preventDefault();
        handlePrevStep();
        return;
    }

    // 右方向键：下一步
    if (e.key === 'ArrowRight' && !el.nextBtn.disabled) {
        e.preventDefault();
        handleNextStep();
        return;
    }

    // 数字键 1 ~ N：选择选项
    if (e.key >= '1' && e.key <= String(APP_CONFIG.maxOptionsPerStep)) {
        const index = parseInt(e.key, 10) - 1;
        const options = el.optionsContainer.querySelectorAll('.option');
        if (options[index]) {
            e.preventDefault();
            options[index].click();
        }
    }
}

/**
 * 判断某个元素是否为“可输入”控件。
 * 若是，则不响应键盘快捷键。
 * @param {Element} element - 当前获得焦点的元素
 * @returns {boolean}
 */
function isTypingElement(element) {
    if (!element) return false;
    const tag = element.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}

/* =====================================================================
 * 17. 控制台调试辅助
 * =====================================================================
 * 暴露部分内部函数到全局，方便开发者在控制台调试。
 * （生产环境可注释掉，不影响功能）
 * =================================================================== */

// 将核心调试函数挂到 window，便于控制台调用
window.debugApp = {
    state: appState,
    calculateTotalScore: calculateTotalScore,
    calculatePercentage: calculatePercentage,
    calculateDimensionPercentages: calculateDimensionPercentages,
    readHistory: readHistory,
    resetTestProgress: resetTestProgress,
    goToHistoryPage: goToHistoryPage,
    goToHomePage: goToHomePage
};

console.log('🔧 [script.js] 调试辅助已就绪，可在控制台输入 debugApp 查看');

/* =====================================================================
 * 18. 扩展功能模块（补全）
 * =====================================================================
 * 以下模块为应用启动所依赖的“扩展能力层”，此前因故缺失，
 * 现已完整补齐。它们分别负责：
 *   - checkDataIntegrity       ：数据层完整性校验（启动自检）
 *   - escapeHtml / showFatalError：HTML 转义与致命错误遮罩
 *   - initExtensionModules     ：扩展模块统一初始化入口
 *   - SoundEngine              ：Web Audio 合成音效
 *   - TimerManager             ：答题计时器
 *   - ThemeManager             ：深色/浅色主题切换
 *   - ConfettiSystem           ：结果页彩带庆祝动画
 *   - Leaderboard              ：本地排行榜
 *   - AchievementSystem        ：成就徽章系统
 *   - renderResultEnhancements ：结果页增强内容（雷达图/徽章/排行榜）
 *   - handleOptionDelegate / handleButtonClickSound：全局点击音效委托
 * =================================================================== */

/* ---------------------------------------------------------------------
 * 18.1 数据层完整性校验
 * ---------------------------------------------------------------------
 * initApp 的第一道防线：在缓存 DOM 之前先确认 data.js 已完整加载，
 * 避免因缺数据导致“按钮无反应却无报错”的静默失败。
 * ------------------------------------------------------------------- */
function checkDataIntegrity() {
    // 依次校验脚本运行所依赖的全局数据常量是否都已由 data.js 提供
    const required = [
        { name: 'APP_CONFIG',         ok: typeof APP_CONFIG !== 'undefined' },
        { name: 'stepsData',          ok: typeof stepsData !== 'undefined' && Array.isArray(stepsData) && stepsData.length > 0 },
        { name: 'RESULT_LEVELS',      ok: typeof RESULT_LEVELS !== 'undefined' && Array.isArray(RESULT_LEVELS) && RESULT_LEVELS.length > 0 },
        { name: 'DIAGNOSIS_RESULTS',  ok: typeof DIAGNOSIS_RESULTS !== 'undefined' && Array.isArray(DIAGNOSIS_RESULTS) },
        { name: 'PRESCRIPTIONS',      ok: typeof PRESCRIPTIONS !== 'undefined' },
        { name: 'SNARKY_COMMENTS',    ok: typeof SNARKY_COMMENTS !== 'undefined' },
        { name: 'DIMENSIONS',         ok: typeof DIMENSIONS !== 'undefined' && Array.isArray(DIMENSIONS) },
        { name: 'socialDeathScripts', ok: typeof socialDeathScripts !== 'undefined' && Array.isArray(socialDeathScripts) },
        { name: 'FEATURE_CONFIG',     ok: typeof FEATURE_CONFIG !== 'undefined' },
        { name: 'ACHIEVEMENTS',       ok: typeof ACHIEVEMENTS !== 'undefined' && Array.isArray(ACHIEVEMENTS) }
    ];

    // 找出缺失项并汇总
    const missing = required.filter(function (item) { return !item.ok; });
    if (missing.length > 0) {
        const names = missing.map(function (item) { return item.name; }).join('、');
        throw new Error('数据层加载不完整，缺少以下常量：' + names + '。请确认 data.js 已在 script.js 之前正确引入。');
    }

    // 逐题校验 stepsData 结构，避免某一步缺选项导致后续渲染崩溃
    stepsData.forEach(function (step, index) {
        if (!step || !step.id || !Array.isArray(step.options) || step.options.length === 0) {
            throw new Error('stepsData 第 ' + (index + 1) + ' 项结构不完整，请检查 data.js 中的题目定义。');
        }
        step.options.forEach(function (option) {
            if (!option || typeof option.value !== 'number' || !option.text) {
                throw new Error('stepsData 第 ' + (index + 1) + ' 题存在非法选项（缺少 text 或 value）。');
            }
        });
    });

    console.log('✅ [checkDataIntegrity] 数据层完整性校验通过：' + stepsData.length + ' 道题、' + RESULT_LEVELS.length + ' 个等级');
}

/* ---------------------------------------------------------------------
 * 18.2 HTML 转义与致命错误遮罩
 * ------------------------------------------------------------------- */

/**
 * 将字符串中的特殊字符转义，防止用户输入/错误信息注入 HTML。
 * @param {*} str - 待转义内容
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 展示致命错误遮罩（初始化失败时调用）。
 * 动态创建（或复用）全屏遮罩，向用户说明失败原因并提供刷新入口。
 * @param {Error|*} err - 捕获到的异常对象
 */
function showFatalError(err) {
    let overlay = document.getElementById('fatal-error-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'fatal-error-overlay';
        overlay.className = 'fatal-error-overlay';
        document.body.appendChild(overlay);
    }

    const message = err && err.message ? err.message : String(err);
    overlay.innerHTML =
        '<div class="fatal-error-card">' +
            '<div class="fatal-error-icon">💥</div>' +
            '<h2>应用启动失败</h2>' +
            '<p>很抱歉，社死评估器在初始化时遇到了问题：</p>' +
            '<pre class="fatal-error-msg">' + escapeHtml(message) + '</pre>' +
            '<p class="fatal-error-tip">请确认 data.js 与 script.js 均已正确加载，然后刷新页面重试。</p>' +
            '<button class="btn-primary" onclick="location.reload()">刷新页面</button>' +
        '</div>';
}

/* ---------------------------------------------------------------------
 * 18.3 扩展模块统一初始化入口
 * ---------------------------------------------------------------------
 * 按 FEATURE_CONFIG 开关决定哪些扩展模块需要初始化，
 * 每个模块都单独 try/catch，避免单个模块异常拖垮整个应用。
 * ------------------------------------------------------------------- */
function initExtensionModules() {
    // 音效模块：Web Audio 需在用户手势后才能真正发声，这里仅完成准备
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableSound) {
        try { SoundEngine.init(); } catch (e) { console.warn('⚠️ 音效模块初始化失败:', e); }
    }

    // 主题模块：读取本地主题偏好并立即应用
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableDarkMode) {
        try { ThemeManager.init(); } catch (e) { console.warn('⚠️ 主题模块初始化失败:', e); }
    }

    // 成就模块
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableAchievements) {
        try { AchievementSystem.init(); } catch (e) { console.warn('⚠️ 成就模块初始化失败:', e); }
    }

    // 排行榜模块
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableLeaderboard) {
        try { Leaderboard.init(); } catch (e) { console.warn('⚠️ 排行榜模块初始化失败:', e); }
    }

    // 彩带模块
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableConfetti) {
        try { ConfettiSystem.init(); } catch (e) { console.warn('⚠️ 彩带模块初始化失败:', e); }
    }

    // 计时器模块（始终初始化，答题页必需）
    try { TimerManager.init(); } catch (e) { console.warn('⚠️ 计时器模块初始化失败:', e); }

    console.log('🧩 [initExtensionModules] 扩展功能模块初始化完成');
}

/* ---------------------------------------------------------------------
 * 18.4 音效引擎（SoundEngine）
 * ---------------------------------------------------------------------
 * 使用 Web Audio API 合成短促音效，无需任何外部音频文件。
 * 所有方法都做了防御性 try/catch，任何异常都静默忽略，
 * 保证音效永远不会影响核心答题流程。
 * ------------------------------------------------------------------- */
const SoundEngine = {
    _ctx: null,       // AudioContext 实例（惰性创建）
    _enabled: false,  // 是否启用音效

    /**
     * 初始化：仅标记启用，真正的 AudioContext 在首次点击时惰性创建。
     */
    init: function () {
        this._enabled = true;
        console.log('🔊 [SoundEngine] 音效模块已就绪（将在首次点击后激活）');
    },

    /**
     * 惰性获取 AudioContext。
     * 浏览器自动播放策略要求 AudioContext 必须在用户手势后创建或恢复。
     * @returns {AudioContext|null}
     */
    _getContext: function () {
        if (!this._enabled) return null;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            if (!this._ctx) this._ctx = new Ctx();
            if (this._ctx.state === 'suspended') this._ctx.resume();
            return this._ctx;
        } catch (err) {
            return null;
        }
    },

    /**
     * 播放一个短促的单音。
     * @param {number} freq     - 频率（Hz）
     * @param {number} duration - 时长（秒）
     * @param {string} type     - 波形类型（sine/square/sawtooth/triangle）
     * @param {number} volume   - 音量（0~1）
     * @param {number} when     - 延迟播放（秒），用于编排多音
     */
    _beep: function (freq, duration, type, volume, when) {
        const ctx = this._getContext();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + (when || 0);

            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // 用 gain 做淡入淡出，避免爆音
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.exponentialRampToValueAtTime(volume || 0.3, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        } catch (err) {
            // 音效失败不影响功能，静默忽略
        }
    },

    /** 点击音效：短促方波，清脆 */
    click: function () {
        this._beep(600, 0.08, 'square', 0.12);
    },

    /** 错误音效：两段下行锯齿波，提示输入错误 */
    error: function () {
        this._beep(220, 0.18, 'sawtooth', 0.18);
        this._beep(160, 0.25, 'sawtooth', 0.18, 0.15);
    },

    /** 成功音效：上行三连音，欢快 */
    success: function () {
        this._beep(523, 0.12, 'sine', 0.22);
        this._beep(659, 0.12, 'sine', 0.22, 0.12);
        this._beep(784, 0.22, 'sine', 0.28, 0.24);
    }
};

/* ---------------------------------------------------------------------
 * 18.5 答题计时器（TimerManager）
 * ---------------------------------------------------------------------
 * 从“开始评估”起计时，到“查看结果”停止，
 * 同时用于“速通大师”成就的用时判定。
 * ------------------------------------------------------------------- */
const TimerManager = {
    _startTime: null,     // 开始时间戳（毫秒）
    _timerId: null,       // setInterval 句柄
    _elapsedSeconds: 0,   // 累计用时（秒）

    /** 初始化：重置显示 */
    init: function () {
        this._resetDisplay();
        console.log('⏱️ [TimerManager] 计时器模块已就绪');
    },

    /** 开始计时（先停止旧计时，避免叠加） */
    start: function () {
        this.stop();
        this._startTime = Date.now();
        this._elapsedSeconds = 0;
        this._render();
        // 每秒刷新一次显示
        this._timerId = setInterval(this._render.bind(this), 1000);
    },

    /** 停止计时并结算累计用时 */
    stop: function () {
        if (this._timerId !== null) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
        if (this._startTime !== null) {
            this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
            this._startTime = null;
        }
    },

    /** 重置计时器 */
    reset: function () {
        this.stop();
        this._elapsedSeconds = 0;
        this._resetDisplay();
    },

    /** 获取当前累计用时（秒） */
    getElapsedSeconds: function () {
        return this._elapsedSeconds;
    },

    /** 内部：刷新显示 */
    _render: function () {
        if (this._startTime !== null) {
            this._elapsedSeconds = Math.floor((Date.now() - this._startTime) / 1000);
        }
        this._resetDisplay();
    },

    /** 内部：把秒数写入 #timer-display */
    _resetDisplay: function () {
        if (el.timerDisplay) {
            el.timerDisplay.textContent = this._format(this._elapsedSeconds);
        }
    },

    /** 内部：秒数格式化为 mm:ss */
    _format: function (seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }
};

/* ---------------------------------------------------------------------
 * 18.6 主题切换（ThemeManager）
 * ---------------------------------------------------------------------
 * 在 body 上切换 .dark-theme 类，配合 style.css 中的变量覆盖实现深色模式。
 * 主题偏好持久化到 localStorage。
 * ------------------------------------------------------------------- */
const ThemeManager = {
    _key: null,   // localStorage 键名
    _dark: false, // 当前是否为深色

    /** 初始化：读取本地偏好并应用 */
    init: function () {
        this._key = FEATURE_CONFIG.themeStorageKey;
        let saved = null;
        try { saved = localStorage.getItem(this._key); } catch (e) { /* 隐私模式下忽略 */ }
        this._dark = saved === 'dark';
        this._apply();
        console.log('🌓 [ThemeManager] 主题已应用：' + (this._dark ? '深色' : '浅色'));
    },

    /** 切换主题并持久化 */
    toggle: function () {
        this._dark = !this._dark;
        this._apply();
        try { localStorage.setItem(this._key, this._dark ? 'dark' : 'light'); } catch (e) { /* 忽略 */ }
    },

    /** 应用主题到 DOM */
    _apply: function () {
        document.body.classList.toggle('dark-theme', this._dark);
        if (el.themeToggleText) {
            el.themeToggleText.textContent = this._dark ? '浅色' : '深色';
        }
        if (el.themeToggle) {
            const icon = el.themeToggle.querySelector('i');
            if (icon) {
                icon.className = this._dark ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
};

/* ---------------------------------------------------------------------
 * 18.7 彩带庆祝（ConfettiSystem）
 * ---------------------------------------------------------------------
 * 纯 DOM + CSS 实现，无需 canvas。结果页生成大量彩色纸片，
 * 从顶部飘落并旋转，动画结束后自动移除，避免 DOM 无限增长。
 * ------------------------------------------------------------------- */
const ConfettiSystem = {
    _container: null,  // 彩带容器
    // 彩带配色（与品牌色一致）
    _colors: ['#ff6b9d', '#ff8e53', '#ffc107', '#20c997', '#17a2b8', '#0066cc', '#e83e8c'],

    /** 初始化（无需额外动作） */
    init: function () {
        console.log('🎊 [ConfettiSystem] 彩带模块已就绪');
    },

    /** 获取（或创建）彩带容器 */
    _getContainer: function () {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.className = 'confetti-container';
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    /**
     * 发射彩带。
     * @param {number} count - 彩带数量
     */
    launch: function (count) {
        const container = this._getContainer();
        const n = count || 80;

        for (let i = 0; i < n; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';

            // 随机横向位置、颜色、尺寸、动画延迟与时长
            piece.style.left = (Math.random() * 100) + '%';
            piece.style.background = this._colors[Math.floor(Math.random() * this._colors.length)];
            piece.style.width = (6 + Math.random() * 8) + 'px';
            piece.style.height = (10 + Math.random() * 10) + 'px';
            piece.style.animationDelay = (Math.random() * 0.6) + 's';
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';

            container.appendChild(piece);

            // 动画结束后自动移除，避免 DOM 无限增长
            (function (node) {
                setTimeout(function () {
                    if (node.parentNode) node.parentNode.removeChild(node);
                }, 4500);
            })(piece);
        }
    }
};

/* ---------------------------------------------------------------------
 * 18.8 本地排行榜（Leaderboard）
 * ---------------------------------------------------------------------
 * 将每次测试成绩写入 localStorage，按分数降序保存前 N 名。
 * 结果页可调用 render() 渲染 TOP 榜单。
 * ------------------------------------------------------------------- */
const Leaderboard = {
    _key: null,   // localStorage 键名
    _max: 10,     // 榜单最大条数

    /** 初始化 */
    init: function () {
        this._key = FEATURE_CONFIG.leaderboardStorageKey;
        this._max = 10;
        console.log('🏆 [Leaderboard] 排行榜模块已就绪');
    },

    /** 读取榜单（解析失败时返回空数组） */
    read: function () {
        try {
            const raw = localStorage.getItem(this._key);
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    },

    /** 写入榜单 */
    write: function (list) {
        try { localStorage.setItem(this._key, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
    },

    /** 新增一条成绩并保持降序、限制条数 */
    add: function (entry) {
        const list = this.read();
        list.push(entry);
        list.sort(function (a, b) { return b.score - a.score; });
        if (list.length > this._max) list.length = this._max;
        this.write(list);
    },

    /** 获取前 n 名 */
    getTop: function (n) {
        return this.read().slice(0, n || this._max);
    },

    /** 渲染榜单到指定容器 */
    render: function (container) {
        const top = this.getTop(5);
        if (!container) return;

        if (top.length === 0) {
            container.innerHTML = '<p class="leaderboard-empty">暂无上榜记录，快去测一次吧！</p>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        let html = '';
        top.forEach(function (item, index) {
            const rank = index < 3 ? medals[index] : (index + 1);
            html += '<div class="leaderboard-item">' +
                '<span class="leaderboard-rank">' + rank + '</span>' +
                '<span class="leaderboard-name">' + item.name + '</span>' +
                '<span class="leaderboard-level">' + (item.level || '') + '</span>' +
                '<span class="leaderboard-score">' + item.score + '%</span>' +
            '</div>';
        });
        container.innerHTML = html;
    }
};

/* ---------------------------------------------------------------------
 * 18.9 成就徽章系统（AchievementSystem）
 * ---------------------------------------------------------------------
 * 依据 data.js 的 ACHIEVEMENTS 定义，在每次测试后自动判定并解锁成就。
 * 解锁状态持久化到 localStorage，解锁时通过 Toast 弹窗提示。
 * ------------------------------------------------------------------- */
const AchievementSystem = {
    _key: null,        // localStorage 键名
    _unlocked: [],     // 已解锁成就 id 列表
    _newUnlocks: [],   // 本次判定中新解锁的 id 列表

    /** 初始化：读取已解锁成就 */
    init: function () {
        this._key = FEATURE_CONFIG.achievementsStorageKey;
        this._unlocked = this._read();
        this._newUnlocks = [];
        console.log('🏅 [AchievementSystem] 成就模块已就绪，已解锁 ' + this._unlocked.length + ' 个成就');
    },

    /** 读取已解锁成就 id 列表 */
    _read: function () {
        try {
            const raw = localStorage.getItem(this._key);
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    },

    /** 持久化已解锁成就 */
    _save: function () {
        try { localStorage.setItem(this._key, JSON.stringify(this._unlocked)); } catch (e) { /* 忽略 */ }
    },

    /** 判断某成就是否已解锁 */
    isUnlocked: function (id) {
        return this._unlocked.indexOf(id) !== -1;
    },

    /** 解锁成就；若已解锁则返回 false */
    _unlock: function (id) {
        if (this.isUnlocked(id)) return false;
        this._unlocked.push(id);
        this._save();
        this._newUnlocks.push(id);
        return true;
    },

    /**
     * 核心判定：根据本次测试结果解锁对应成就。
     * @param {number} percentage - 尴尬指数（0~100）
     * @param {number} elapsed    - 本轮用时（秒）
     */
    checkAll: function (percentage, elapsed) {
        if (!FEATURE_CONFIG || !FEATURE_CONFIG.enableAchievements) return;
        this._newUnlocks = [];

        const level = getResultLevel(percentage);

        // 1. 首次测试
        this._unlock('first_test');

        // 2. 等级相关成就（依据 RESULT_LEVELS 的 key 判定，无需写死阈值）
        if (level && level.key === 'critical') this._unlock('critical_hit');
        if (level && level.key === 'mild') this._unlock('mild_survivor');

        // 3. 满分 / 零分
        if (percentage === 100) this._unlock('perfect_score');
        if (percentage === 0) this._unlock('zero_score');

        // 4. 深夜病号（凌晨 0~5 点完成）
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) this._unlock('night_owl');

        // 5. 速通大师（规定时间内完成）
        if (typeof elapsed === 'number' && elapsed > 0 && elapsed <= FEATURE_CONFIG.speedRunnerSeconds) {
            this._unlock('speed_runner');
        }

        // 6. 回头客（累计完成 3 次诊断，通过历史记录条数推断）
        if (this._readRunCount() >= 3) this._unlock('repeater');

        // 有新解锁时依次弹出提示
        if (this._newUnlocks.length > 0) {
            this._announce(this._newUnlocks);
        }
    },

    /** 读取累计完成次数（用历史记录条数推断） */
    _readRunCount: function () {
        try {
            const raw = localStorage.getItem(APP_CONFIG.storageKey);
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data.length : 0;
        } catch (e) {
            return 0;
        }
    },

    /** 弹窗提示新解锁的成就 */
    _announce: function (ids) {
        ids.forEach(function (id, index) {
            const ach = ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0];
            if (!ach) return;
            setTimeout(function () {
                showToast('成就解锁：' + ach.emoji + ' ' + ach.name + ' — ' + ach.desc, 'success');
            }, 600 + index * 900);
        });
    },

    /** 获取已解锁成就 id 列表 */
    getUnlocked: function () {
        return this._unlocked.slice();
    }
};

/* ---------------------------------------------------------------------
 * 18.10 结果页增强内容渲染
 * ---------------------------------------------------------------------
 * 在诊断报告下方追加：维度雷达图、成就徽章、排行榜、分享文案。
 * 调用时机：showResult 的最后一步（在成就判定与排行榜写入之后）。
 * ------------------------------------------------------------------- */

/**
 * 渲染结果页增强内容。
 * @param {number} percentage - 尴尬指数
 * @param {Object} level      - 结果等级对象
 */
function renderResultEnhancements(percentage, level) {
    const report = el.resultContainer.querySelector('.diagnosis-report');
    if (!report) return;

    const dimensions = calculateDimensionPercentages();

    let html = '<div class="result-enhancements">';

    // —— 1. 维度雷达图 ——
    html += '<div class="enhancement-section">' +
        '<h3><i class="fas fa-compass"></i> 尴尬维度雷达图</h3>' +
        buildRadarChart(dimensions) +
    '</div>';

    // —— 2. 成就徽章 ——
    html += '<div class="enhancement-section">' +
        '<h3><i class="fas fa-medal"></i> 已解锁成就</h3>' +
        buildAchievementBadges() +
    '</div>';

    // —— 3. 排行榜 ——
    html += '<div class="enhancement-section">' +
        '<h3><i class="fas fa-trophy"></i> 社死排行榜 TOP5</h3>' +
        '<div id="leaderboard-list" class="leaderboard-list"></div>' +
    '</div>';

    // —— 4. 分享文案 ——
    html += '<div class="enhancement-section">' +
        '<h3><i class="fas fa-share-alt"></i> 一键传播社死</h3>' +
        '<p class="share-slogan">' + getRandomShareText() + '（当前尴尬指数 ' + percentage + '%）</p>' +
    '</div>';

    html += '</div>';

    // 插入到免责声明之前；若找不到免责声明则追加到报告末尾
    const disclaimer = report.querySelector('.disclaimer');
    if (disclaimer) {
        disclaimer.insertAdjacentHTML('beforebegin', html);
    } else {
        report.insertAdjacentHTML('beforeend', html);
    }

    // 渲染排行榜（依赖 #leaderboard-list 已插入 DOM）
    if (FEATURE_CONFIG && FEATURE_CONFIG.enableLeaderboard) {
        Leaderboard.render(document.getElementById('leaderboard-list'));
    }
}

/**
 * 构建维度雷达图（SVG）。
 * @param {Object} dimensions - 各维度百分比对象
 * @returns {string} SVG 字符串
 */
function buildRadarChart(dimensions) {
    const keys = DIMENSIONS.map(function (d) { return d.key; });
    const values = keys.map(function (k) {
        return typeof dimensions[k] === 'number' ? dimensions[k] : 0;
    });

    const size = 240;              // SVG 画布尺寸
    const center = size / 2;       // 圆心
    const radius = 80;             // 最大半径
    const n = keys.length;         // 维度数量
    const angleStep = (Math.PI * 2) / n;

    // 计算第 i 个顶点的坐标（从正上方开始顺时针排布）
    function point(i, r) {
        const angle = -Math.PI / 2 + angleStep * i;
        return {
            x: center + Math.cos(angle) * r,
            y: center + Math.sin(angle) * r
        };
    }

    // 网格：3 层同心多边形
    let grid = '';
    for (let layer = 1; layer <= 3; layer++) {
        const r = radius * layer / 3;
        const pts = keys.map(function (_, i) {
            const p = point(i, r);
            return p.x.toFixed(1) + ',' + p.y.toFixed(1);
        }).join(' ');
        grid += '<polygon points="' + pts + '" class="radar-grid"></polygon>';
    }

    // 轴线：圆心到各顶点
    let axes = '';
    keys.forEach(function (_, i) {
        const p = point(i, radius);
        axes += '<line x1="' + center + '" y1="' + center + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" class="radar-axis"></line>';
    });

    // 数据多边形：按百分比缩放半径
    const dataPts = values.map(function (v, i) {
        const r = radius * Math.max(0, Math.min(100, v)) / 100;
        const p = point(i, r);
        return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
    const dataPoly = '<polygon points="' + dataPts + '" class="radar-data"></polygon>';

    // 顶点标签
    let labels = '';
    keys.forEach(function (k, i) {
        const p = point(i, radius + 24);
        labels += '<text x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '" class="radar-label">' + DIMENSIONS[i].name + '</text>';
    });

    return '<svg class="radar-chart" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="尴尬维度雷达图">' +
        grid + axes + dataPoly + labels + '</svg>';
}

/**
 * 构建成就徽章列表。
 * @returns {string} 徽章 HTML
 */
function buildAchievementBadges() {
    const unlocked = AchievementSystem.getUnlocked();

    if (unlocked.length === 0) {
        return '<p class="achievement-empty">完成一次测试即可解锁成就徽章！</p>';
    }

    let html = '<div class="achievement-badges">';
    ACHIEVEMENTS.forEach(function (ach) {
        const done = unlocked.indexOf(ach.id) !== -1;
        html += '<div class="achievement-badge' + (done ? ' unlocked' : ' locked') + '" title="' + ach.desc + '">' +
            '<span class="achievement-emoji">' + (done ? ach.emoji : '🔒') + '</span>' +
            '<span class="achievement-name">' + ach.name + '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
}

/* ---------------------------------------------------------------------
 * 18.11 全局点击音效委托
 * ------------------------------------------------------------------- */

/**
 * 选项点击音效（事件委托）。
 * 选项元素是动态渲染的，故在容器上委托监听。
 * @param {Event} e - 点击事件
 */
function handleOptionDelegate(e) {
    const option = e.target && e.target.closest ? e.target.closest('.option') : null;
    if (option) {
        SoundEngine.click();
    }
}

/**
 * 全局按钮点击音效（事件委托）。
 * 自动忽略禁用按钮，并跳过“开始评估”按钮，
 * 因为 handleStartTest 内部已自行播放音效，避免重复发声。
 * @param {Event} e - 点击事件
 */
function handleButtonClickSound(e) {
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;                   // 不是按钮
    if (btn.disabled) return;           // 禁用按钮不发声
    if (btn.id === 'start-btn') return; // 开始按钮已单独处理
    SoundEngine.click();
}

console.log('🧩 [script.js] 扩展功能模块已全部加载完成');

/** 本地 Canvas 海报，不依赖外部图片或服务，也不包含年龄、性别。 */
function buildResultPoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1260;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持海报绘制');
    const pct = calculatePercentage();
    const level = getResultLevel(pct);
    const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
    function text(value, x, y, size, color, weight) {
        ctx.font = (weight || '400') + ' ' + size + 'px ' + font;
        ctx.fillStyle = color;
        ctx.fillText(value, x, y);
    }
    function rounded(x, y, width, height, radius, fill) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fillStyle = fill;
        ctx.fill();
    }
    const gradient = ctx.createLinearGradient(0, 0, 900, 1260);
    gradient.addColorStop(0, '#ece6fc');
    gradient.addColorStop(1, '#dcebf2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 1260);
    rounded(48, 48, 804, 1164, 36, '#ffffff');
    text('SOCIAL SURVIVAL REPORT', 100, 123, 22, '#6554c0', '700');
    text('我的社死诊断书', 100, 190, 48, '#26243c', '700');
    text('尴尬有尽头，快乐无上限。', 100, 239, 25, '#716e84');
    ctx.strokeStyle = '#e9e6f2';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(100, 278); ctx.lineTo(800, 278); ctx.stroke();
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#eeebf6';
    ctx.beginPath(); ctx.arc(450, 450, 126, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#6554c0'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(450, 450, 126, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct / 100); ctx.stroke();
    ctx.textAlign = 'center';
    text(pct + '%', 450, 468, 76, '#6554c0', '700');
    text('综合尴尬指数', 450, 516, 23, '#716e84');
    text(level.title, 450, 652, 39, '#26243c', '700');
    text('诊断等级 · ' + level.severity, 450, 701, 24, '#605d75');
    ctx.textAlign = 'left';
    const dimensions = calculateDimensionPercentages();
    DIMENSIONS.forEach(function (dim, index) {
        const y = 781 + index * 65;
        text(dim.name, 100, y, 23, '#605d75');
        rounded(260, y - 18, 430, 14, 7, '#eeebf6');
        const value = dimensions[dim.key] || 0;
        if (value > 0) rounded(260, y - 18, 430 * value / 100, 14, 7, '#6554c0');
        text(value + '%', 720, y, 23, '#6554c0', '700');
    });
    rounded(100, 1052, 700, 72, 18, '#f4f3f9');
    ctx.textAlign = 'center';
    text('社死指数评估器 · 你敢来测测吗？', 450, 1098, 25, '#6554c0', '700');
    text('仅供娱乐，每一次尴尬都会成为故事。', 450, 1170, 20, '#716e84');
    return canvas;
}

function openResultPoster() {
    let dialog = document.getElementById('poster-dialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'poster-dialog';
        dialog.className = 'poster-dialog';
        dialog.setAttribute('aria-labelledby', 'poster-heading');
        dialog.innerHTML = '<div class="poster-heading"><div><h2 id="poster-heading">把尴尬变成纪念</h2><p>保存你的专属结果，分享给朋友。</p></div><button type="button" class="poster-close" aria-label="关闭海报">×</button></div>' +
            '<img id="poster-preview" alt="本次社死评估结果分享海报">' +
            '<p class="poster-note">海报不含年龄和性别；手机也可长按图片保存。</p>' +
            '<a id="poster-download" class="btn-primary" download="社死诊断书.png">下载 PNG 海报</a>';
        document.body.appendChild(dialog);
        dialog.querySelector('.poster-close').addEventListener('click', function () { dialog.close(); });
        dialog.addEventListener('click', function (event) { if (event.target === dialog) {
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        } });
    }
    try {
        const url = buildResultPoster().toDataURL('image/png');
        dialog.querySelector('#poster-preview').src = url;
        dialog.querySelector('#poster-download').href = url;
        if (!dialog.open) dialog.showModal();
    } catch (error) {
        showToast('海报生成失败，请重试或更新浏览器', 'error');
        console.warn('海报生成失败:', error);
    }
}
