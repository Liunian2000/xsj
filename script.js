// 全局变量
let currentCharacterId = null;
let characters = [];
let chatHistory = {};
let messageDelayTimer = null;
let pendingMessages = [];
let debugLog = []; // 存储调试日志
let settings = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.8,
    topP: 0.9,
    contextCount: 20,
    fullscreen: true,
    resolution: '3200x1440',
    aspectRatio: '3200/1440',
    rolePlayPrompt: '请你扮演一个角色，严格按照以下设定进行对话和回应：',
    enableRolePlay: true,
    enableDelaySend: true,
    replyDelay: 15,
    showDelayHint: true,
    enableMultiMessage: true,
    multiMessageSeparator: '@@@@',
    enableDebugLog: false,
    logRetentionDays: 7
};

// 记录调试日志
function logDebugEvent(type, data) {
    if (!settings.enableDebugLog) {
        return; // 如果未启用调试日志，则不记录
    }
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type, // 'api_request', 'api_response', 'settings_change', 'error', etc.
        data: data
    };
    
    debugLog.push(logEntry);
    
    // 限制日志数量，避免内存占用过多
    const maxLogEntries = 1000;
    if (debugLog.length > maxLogEntries) {
        debugLog = debugLog.slice(-maxLogEntries);
    }
    
    // 保存日志到本地存储
    saveDebugLog();
}

// 保存调试日志到本地存储
function saveDebugLog() {
    if (!settings.enableDebugLog) {
        return;
    }
    
    try {
        localStorage.setItem('debugLog', JSON.stringify(debugLog));
    } catch (error) {
        console.error('保存调试日志失败:', error);
    }
}

// 从本地存储加载调试日志
function loadDebugLog() {
    try {
        const savedLog = localStorage.getItem('debugLog');
        if (savedLog) {
            debugLog = JSON.parse(savedLog);
            
            // 清理过期日志
            cleanOldDebugLogs();
        }
    } catch (error) {
        console.error('加载调试日志失败:', error);
        debugLog = [];
    }
}

// 清理过期的调试日志
function cleanOldDebugLogs() {
    if (!settings.enableDebugLog || debugLog.length === 0) {
        return;
    }
    
    const retentionDays = settings.logRetentionDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const originalLength = debugLog.length;
    debugLog = debugLog.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
    });
    
    if (debugLog.length !== originalLength) {
        saveDebugLog(); // 保存清理后的日志
    }
}

// 清空调试日志
function clearDebugLog() {
    debugLog = [];
    if (settings.enableDebugLog) {
        saveDebugLog();
    }
    updateLogSizeDisplay();
}

// 导出调试日志
function exportDebugLog() {
    if (debugLog.length === 0) {
        alert('没有可导出的日志');
        return;
    }
    
    // 创建日志文本
    let logText = '调试日志导出\n';
    logText += `导出时间: ${new Date().toLocaleString()}\n`;
    logText += `日志条数: ${debugLog.length}\n`;
    logText += '=' .repeat(80) + '\n\n';
    
    debugLog.forEach(entry => {
        const date = new Date(entry.timestamp);
        logText += `[${date.toLocaleString()}] ${entry.type.toUpperCase()}\n`;
        
        if (typeof entry.data === 'object') {
            logText += JSON.stringify(entry.data, null, 2);
        } else {
            logText += entry.data;
        }
        
        logText += '\n' + '-'.repeat(40) + '\n\n';
    });
    
    // 创建下载链接
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 更新日志大小显示
function updateLogSizeDisplay() {
    const logSizeElement = document.getElementById('current-log-size');
    if (!logSizeElement) {
        return;
    }
    
    if (!settings.enableDebugLog || debugLog.length === 0) {
        logSizeElement.textContent = '无日志数据';
        return;
    }
    
    // 计算日志大小（近似值）
    const logSizeBytes = JSON.stringify(debugLog).length;
    let sizeText;
    
    if (logSizeBytes < 1024) {
        sizeText = `${logSizeBytes} 字节`;
    } else if (logSizeBytes < 1024 * 1024) {
        sizeText = `${(logSizeBytes / 1024).toFixed(2)} KB`;
    } else {
        sizeText = `${(logSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    
    logSizeElement.textContent = `${sizeText}，共 ${debugLog.length} 条记录`;
}

// 显示数据管理屏幕
function showDataSettings() {
    showScreen('data-settings-screen');
}

// 导出所有数据
function exportAllData() {
    try {
        // 收集所有数据
        const exportData = {
            version: "2.0.0",
            exportDate: new Date().toISOString(),
            settings: settings,
            characters: characters,
            chatHistory: chatHistory,
            debugLog: debugLog
        };
        
        // 创建JSON字符串
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // 创建下载链接
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LiunianPhone_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 记录导出事件
        logDebugEvent('data_export', {
            timestamp: new Date().toISOString(),
            dataSize: jsonString.length
        });
        
        alert('数据导出成功！');
    } catch (error) {
        console.error('导出数据失败:', error);
        alert('导出数据失败，请查看控制台了解详情');
    }
}

// 处理导入数据
function handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.name.endsWith('.json')) {
        alert('请选择有效的JSON文件');
        return;
    }
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!importData.settings || !importData.characters || !importData.chatHistory) {
                alert('无效的数据格式，请确保是从本应用导出的数据文件');
                return;
            }
            
            // 确认导入
            const confirmed = confirm('导入数据将清空当前所有数据并替换为导入的数据。\n\n此操作不可恢复，确定要继续吗？');
            if (!confirmed) return;
            
            // 清空当前数据
            characters = [];
            chatHistory = {};
            debugLog = [];
            
            // 导入新数据
            settings = { ...settings, ...importData.settings };
            characters = importData.characters;
            chatHistory = importData.chatHistory;
            
            if (importData.debugLog) {
                debugLog = importData.debugLog;
            }
            
            // 保存到本地存储
            saveCharacters();
            saveChatHistory();
            saveSettingsToStorage();
            saveDebugLog();
            
            // 刷新界面
            loadCharacters();
            if (currentCharacterId) {
                loadChatHistory(currentCharacterId);
                renderChatMessages();
            }
            
            // 记录导入事件
            logDebugEvent('data_import', {
                timestamp: new Date().toISOString(),
                importVersion: importData.version || 'unknown',
                importDate: importData.exportDate || 'unknown'
            });
            
            alert('数据导入成功！页面将刷新以应用新数据。');
            location.reload();
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败，请确保文件格式正确');
        }
    };
    
    reader.readAsText(file);
    
    // 重置文件输入，允许重复选择同一文件
    event.target.value = '';
}

// 清空所有数据
function clearAllData() {
    const confirmed = confirm('确定要清空所有数据吗？\n\n此操作将删除所有设置、角色和聊天记录，且不可恢复！');
    if (!confirmed) return;
    
    const doubleConfirmed = confirm('请再次确认：您确定要清空所有数据吗？');
    if (!doubleConfirmed) return;
    
    try {
        // 清空所有数据
        characters = [];
        chatHistory = {};
        debugLog = [];
        settings = {
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            temperature: 0.8,
            topP: 0.9,
            contextCount: 20,
            fullscreen: true,
            resolution: '3200x1440',
            aspectRatio: '3200/1440',
            rolePlayPrompt: '请你扮演一个角色，严格按照以下设定进行对话和回应：',
            enableRolePlay: true,
            enableDelaySend: true,
            replyDelay: 15,
            showDelayHint: true,
            enableMultiMessage: true,
            multiMessageSeparator: '@@@@',
            enableDebugLog: false,
            logRetentionDays: 7
        };
        
        // 清空本地存储
        localStorage.removeItem('LiunianPhone-characters');
        localStorage.removeItem('LiunianPhone-chat-history');
        localStorage.removeItem('LiunianPhone-settings');
        localStorage.removeItem('debugLog');
        
        // 记录清空事件（无法保存到本地存储，因为已清空）
        console.log('所有数据已清空');
        
        alert('所有数据已清空！页面将刷新。');
        location.reload();
    } catch (error) {
        console.error('清空数据失败:', error);
        alert('清空数据失败，请查看控制台了解详情');
    }
}

// 显示调试信息设置屏幕
function showDebugSettings() {
    // 更新UI显示当前设置
    document.getElementById('enable-debug-log').checked = settings.enableDebugLog;
    document.getElementById('log-retention-days').value = settings.logRetentionDays;
    
    // 更新日志大小显示
    updateLogSizeDisplay();
    
    // 切换到调试设置屏幕
    showScreen('debug-settings-screen');
}

// 保存调试信息设置
function saveDebugSettings() {
    // 获取设置值
    const enableDebugLog = document.getElementById('enable-debug-log').checked;
    const logRetentionDays = parseInt(document.getElementById('log-retention-days').value);
    
    // 检查是否需要禁用调试日志
    const wasEnabled = settings.enableDebugLog;
    settings.enableDebugLog = enableDebugLog;
    settings.logRetentionDays = logRetentionDays;
    
    // 保存设置
    saveSettings();
    
    // 如果从启用变为禁用，清空日志
    if (wasEnabled && !enableDebugLog) {
        debugLog = [];
        localStorage.removeItem('debugLog');
    } 
    // 如果从禁用变为启用，加载日志
    else if (!wasEnabled && enableDebugLog) {
        loadDebugLog();
    }
    // 如果只是修改了保留天数，清理旧日志
    else if (enableDebugLog) {
        cleanOldDebugLogs();
    }
    
    // 更新日志大小显示
    updateLogSizeDisplay();
    
    // 记录设置变更
    logDebugEvent('settings_change', {
        setting: 'debug_settings',
        enableDebugLog: enableDebugLog,
        logRetentionDays: logRetentionDays
    });
    
    // 返回设置屏幕
    showScreen('settings-screen');
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时间显示
    updateTime();
    setInterval(updateTime, 1000);
    
    // 初始化电池状态
    initBatteryStatus();
    
    // 加载本地数据
    loadCharacters();
    loadSettings();
    loadDebugLog();
    loadChatHistory();
    
    // 设置默认背景
    document.getElementById('home-screen').style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // 初始化全屏状态
    initFullscreen();
    
    // 初始化多消息输出设置
    const enableMultiMessageCheckbox = document.getElementById('enable-multi-message');
    const multiMessageFormatGroup = document.getElementById('multi-message-format-group');
    
    // 添加事件监听器
    enableMultiMessageCheckbox.addEventListener('change', function() {
        if (this.checked) {
            multiMessageFormatGroup.style.display = 'block';
        } else {
            multiMessageFormatGroup.style.display = 'none';
        }
    });
    
    // 根据当前设置显示或隐藏分隔符设置
    if (enableMultiMessageCheckbox.checked) {
        multiMessageFormatGroup.style.display = 'block';
    } else {
        multiMessageFormatGroup.style.display = 'none';
    }
    
    // 注册Service Worker（仅在HTTPS或localhost环境下）
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('Service Worker注册成功:', registration.scope))
            .catch(error => console.log('Service Worker注册失败:', error));
    }
});

// 更新时间显示
function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    const dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
                   ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
    
    document.getElementById('main-time').textContent = timeStr;
    document.getElementById('main-date').textContent = dateStr;
    document.getElementById('status-bar-time').textContent = timeStr;
}

// 初始化电池状态
function initBatteryStatus() {
    // 检查浏览器是否支持Battery API
    if ('getBattery' in navigator) {
        navigator.getBattery().then(function(battery) {
            // 初始更新电池状态
            updateBatteryStatus(battery);
            
            // 监听电池状态变化
            battery.addEventListener('levelchange', function() {
                updateBatteryStatus(battery);
            });
            
            battery.addEventListener('chargingchange', function() {
                updateBatteryStatus(battery);
            });
        }).catch(function(error) {
            console.error('获取电池信息失败:', error);
            // 使用默认值
            setDefaultBatteryStatus();
        });
    } else {
        console.log('浏览器不支持Battery API');
        // 使用默认值
        setDefaultBatteryStatus();
    }
}

// 更新电池状态显示
function updateBatteryStatus(battery) {
    // 获取电量百分比
    const level = Math.round(battery.level * 100);
    const batteryLevel = document.querySelector('.battery-level');
    const batteryText = document.querySelector('.battery-text');
    
    if (batteryLevel) {
        batteryLevel.style.width = level + '%';
    }
    
    if (batteryText) {
        batteryText.textContent = level + '%';
    }
    
    // 根据电量设置颜色
    if (batteryLevel) {
        if (level <= 20) {
            batteryLevel.style.backgroundColor = '#ff4d4d'; // 红色
        } else if (level <= 50) {
            batteryLevel.style.backgroundColor = '#ffaa00'; // 橙色
        } else {
            batteryLevel.style.backgroundColor = 'white'; // 白色
        }
    }
}

// 设置默认电池状态
function setDefaultBatteryStatus() {
    const batteryLevel = document.querySelector('.battery-level');
    const batteryText = document.querySelector('.battery-text');
    
    if (batteryLevel) {
        batteryLevel.style.width = '80%';
        batteryLevel.style.backgroundColor = 'white';
    }
    
    if (batteryText) {
        batteryText.textContent = '80%';
    }
}

// 屏幕切换
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 显示角色列表
function showCharacterList() {
    renderCharacterList();
    showScreen('character-list-screen');
}

// 渲染角色列表
function renderCharacterList() {
    const characterList = document.getElementById('character-list');
    characterList.innerHTML = '';
    
    if (characters.length === 0) {
        characterList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">暂无角色，点击右上角"+"添加</div>';
        return;
    }
    
    characters.forEach(character => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.onclick = () => openChat(character.id);
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        if (character.avatar) {
            avatar.style.backgroundImage = `url(${character.avatar})`;
            avatar.style.backgroundSize = 'cover';
        } else {
            avatar.textContent = character.name.charAt(0);
        }
        
        const info = document.createElement('div');
        info.className = 'info';
        
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = character.name;
        
        info.appendChild(name);
        listItem.appendChild(avatar);
        listItem.appendChild(info);
        characterList.appendChild(listItem);
    });
}

// 打开聊天界面
function openChat(characterId) {
    currentCharacterId = characterId;
    const character = characters.find(c => c.id === characterId);
    document.getElementById('chat-character-name').textContent = character.name;
    
    // 初始化聊天记录（如果不存在）
    if (!chatHistory[characterId]) {
        chatHistory[characterId] = [];
    }
    
    renderChatMessages();
    showScreen('chat-screen');
}

// 渲染聊天消息
function renderChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    const messages = chatHistory[currentCharacterId] || [];
    
    messages.forEach(message => {
        // 如果是多消息，分割并逐条渲染
        if (message.isMultiMessage) {
            const splitMessages = splitMultiMessages(message.content);
            splitMessages.forEach((msg, index) => {
                // 渲染每条分割后的消息
                renderSingleMessage(message.sender, msg.trim());
            });
        } else {
            // 普通消息，直接渲染
            renderSingleMessage(message.sender, message.content);
        }
    });
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 渲染单条消息
function renderSingleMessage(sender, content) {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // 普通消息处理
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // 如果是AI消息，则渲染Markdown格式和数学公式
    if (sender === 'ai') {
        // 先渲染Markdown
        bubble.innerHTML = marked.parse(content);
        
        // 然后渲染数学公式
        renderMathInElement(bubble, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
        });
    } else {
        // 用户消息保持纯文本
        bubble.textContent = content;
    }
    
    messageDiv.appendChild(bubble);
    
    chatMessages.appendChild(messageDiv);
}

// 发送消息

// 发送消息
// 处理输入框回车事件
function handleInputKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // 清空输入框
    input.value = '';
    
    // 立即显示用户消息
    addMessage('user', message);
    
    // 如果启用了延迟发送
    if (settings.enableDelaySend) {
        // 添加消息到待发送列表
        pendingMessages.push(message);
        
        // 不显示任何提示，完全无感
        // if (settings.showDelayHint) {
        //     showSimpleDelayHint();
        // }
        
        // 重置计时器
        if (messageDelayTimer) {
            clearTimeout(messageDelayTimer);
        }
        
        // 设置新的计时器
        messageDelayTimer = setTimeout(() => {
            sendPendingMessages();
        }, settings.replyDelay * 1000);
    } else {
        // 如果未启用延迟发送，直接发送消息
        await callAIForResponse(message);
    }
}

// 发送待发送的消息
async function sendPendingMessages() {
    if (pendingMessages.length === 0) return;
    
    // 合并所有待发送的消息
    const combinedMessage = pendingMessages.join('\n');
    
    // 清空待发送消息列表
    pendingMessages = [];
    
    // 不移除延迟提示，因为我们已经不显示了
    // if (settings.showDelayHint) {
    //     hideDelayHint();
    // }
    
    // 调用AI获取回复
    await callAIForResponse(combinedMessage);
}

// 分割多消息
function splitMultiMessages(content) {
    if (!settings.enableMultiMessage) {
        return [content]; // 如果未启用多消息输出，返回原始内容
    }
    
    // 使用分隔符分割消息
    const separator = settings.multiMessageSeparator || '@@@@';
    const messages = content.split(separator);
    
    // 过滤掉空消息
    return messages.filter(msg => msg.trim() !== '');
}

// 调用AI获取回复
async function callAIForResponse(message) {
    // 显示等待状态
    const waitingDiv = document.createElement('div');
    waitingDiv.className = 'message ai';
    waitingDiv.id = 'waiting-message';
    
    const waitingBubble = document.createElement('div');
    waitingBubble.className = 'message-bubble';
    waitingBubble.textContent = '正在输入...';
    
    waitingDiv.appendChild(waitingBubble);
    document.getElementById('chat-messages').appendChild(waitingDiv);
    
    try {
        // 调用AI API
        const response = await callAIAPI(message);
        
        // 移除等待状态
        document.getElementById('waiting-message').remove();
        
        // 分割多消息
        const messages = splitMultiMessages(response);
        
        // 如果有多条消息，将它们作为一个整体保存，但标记为多消息
        if (messages.length > 1) {
            // 保存原始响应内容，但标记为多消息
            addMessage('ai', response, { isMultiMessage: true });
            
            // 逐条显示消息
            for (let i = 0; i < messages.length; i++) {
                // 如果不是第一条消息，添加延迟
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒延迟
                }
                
                // 直接添加到DOM，不保存到聊天历史
                addMessageToDOM('ai', messages[i].trim());
            }
        } else {
            // 只有一条消息，正常处理
            addMessage('ai', messages[0].trim());
        }
    } catch (error) {
        // 移除等待状态
        document.getElementById('waiting-message').remove();
        
        // 添加错误消息，包含所有重试尝试的错误信息
        let errorMessage = '抱歉，发生了错误：' + error.message;
        
        // 如果错误对象包含详细的错误列表，添加到消息中
        if (error.errors && error.errors.length > 0) {
            errorMessage += '\n\n详细错误信息：';
            error.errors.forEach((err, index) => {
                errorMessage += `\n尝试 ${err.attempt}: ${err.error}`;
                if (err.status) {
                    errorMessage += ` (状态码: ${err.status})`;
                }
            });
        }
        
        addMessage('ai', errorMessage);
    }
}

// 发送单个消息（已弃用，保留以备后用）
async function sendSingleMessage(message) {
    // 注意：此函数已弃用，请使用callAIForResponse代替
    // 这里保留代码以备后用
    
    // 显示等待状态
    const waitingDiv = document.createElement('div');
    waitingDiv.className = 'message ai';
    waitingDiv.id = 'waiting-message';
    
    const waitingBubble = document.createElement('div');
    waitingBubble.className = 'message-bubble';
    waitingBubble.textContent = '正在输入...';
    
    waitingDiv.appendChild(waitingBubble);
    document.getElementById('chat-messages').appendChild(waitingDiv);
    
    try {
        // 调用AI API
        const response = await callAIAPI(message);
        
        // 移除等待状态
        document.getElementById('waiting-message').remove();
        
        // 添加AI回复
        addMessage('ai', response);
    } catch (error) {
        // 移除等待状态
        document.getElementById('waiting-message').remove();
        
        // 添加错误消息，包含所有重试尝试的错误信息
        let errorMessage = '抱歉，发生了错误：' + error.message;
        
        // 如果错误对象包含详细的错误列表，添加到消息中
        if (error.errors && error.errors.length > 0) {
            errorMessage += '\n\n详细错误信息：';
            error.errors.forEach((err, index) => {
                errorMessage += `\n尝试 ${err.attempt}: ${err.error}`;
                if (err.status) {
                    errorMessage += ` (状态码: ${err.status})`;
                }
            });
        }
        
        addMessage('ai', errorMessage);
    }
}

// 显示简单的延迟提示（不显示倒计时）
function showSimpleDelayHint() {
    // 检查是否已存在延迟提示
    let hintElement = document.getElementById('delay-hint');
    
    if (!hintElement) {
        hintElement = document.createElement('div');
        hintElement.id = 'delay-hint';
        hintElement.className = 'delay-hint';
        hintElement.textContent = '正在收集消息...';
        document.getElementById('chat-messages').appendChild(hintElement);
    }
    
    // 滚动到底部
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 显示延迟提示（保留原函数以备后用）
function showDelayHint() {
    // 检查是否已存在延迟提示
    let hintElement = document.getElementById('delay-hint');
    
    if (!hintElement) {
        hintElement = document.createElement('div');
        hintElement.id = 'delay-hint';
        hintElement.className = 'delay-hint';
        hintElement.textContent = `消息将在${settings.replyDelay}秒后发送`;
        document.getElementById('chat-messages').appendChild(hintElement);
    } else {
        // 更新倒计时
        updateDelayHintCountdown();
    }
    
    // 滚动到底部
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 更新延迟提示倒计时（保留原函数以备后用）
function updateDelayHintCountdown() {
    const hintElement = document.getElementById('delay-hint');
    if (!hintElement) return;
    
    // 明确不显示倒计时数字，只显示固定的收集消息提示
    // 这样可以避免用户看到倒计时而产生焦虑感
    hintElement.textContent = '正在收集消息...';
}

// 隐藏延迟提示
function hideDelayHint() {
    const hintElement = document.getElementById('delay-hint');
    if (hintElement) {
        hintElement.remove();
    }
}

// 添加消息到聊天记录
function addMessage(sender, content, options = {}) {
    if (!chatHistory[currentCharacterId]) {
        chatHistory[currentCharacterId] = [];
    }
    
    chatHistory[currentCharacterId].push({
        sender: sender,
        content: content,
        timestamp: new Date().toISOString(),
        ...options // 添加额外的选项，如isMultiMessage标记
    });
    
    saveChatHistory();
    
    // 如果是多消息，不立即渲染，因为会通过addMessageToDOM逐条添加
    if (options.isMultiMessage) {
        return;
    }
    
    renderChatMessages();
}

// 直接添加消息到DOM，不保存到聊天历史
function addMessageToDOM(sender, content) {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // 普通消息处理
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // 如果是AI消息，则渲染Markdown格式和数学公式
    if (sender === 'ai') {
        // 先渲染Markdown
        bubble.innerHTML = marked.parse(content);
        
        // 然后渲染数学公式
        renderMathInElement(bubble, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
        });
    } else {
        // 用户消息保持纯文本
        bubble.textContent = content;
    }
    
    messageDiv.appendChild(bubble);
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 调用AI API
async function callAIAPI(message) {
    const character = characters.find(c => c.id === currentCharacterId);
    
    // 构建角色扮演系统提示词，然后拼接用户提供的persona
    let systemPrompt;
    if (settings.enableRolePlay) {
        const rolePlayPrompt = settings.rolePlayPrompt || "请你扮演一个角色，严格按照以下设定进行对话和回应：";
        systemPrompt = rolePlayPrompt + "\n\n" + (character.persona || '你是一个友好的AI助手');
    } else {
        // 如果禁用了角色扮演模式，直接使用persona
        systemPrompt = character.persona || '你是一个友好的AI助手';
    }
    
    // 如果启用了多消息输出，添加多消息格式约束
    if (settings.enableMultiMessage) {
        systemPrompt += "\n\n重要：请在你的回复中使用" + settings.multiMessageSeparator + "作为分隔符，将长回复拆分为多条短消息。这样可以让对话更加自然流畅。例如：你好" + settings.multiMessageSeparator + "今天天气不错呢" + settings.multiMessageSeparator + "你说对吧。";
    }
    
    // 构建消息历史
    const messages = [
        { role: 'system', content: systemPrompt }
    ];
    
    // 添加最近的聊天历史（根据设置中的上下文数量限制）
    const recentMessages = chatHistory[currentCharacterId].slice(-settings.contextCount);
    recentMessages.forEach(msg => {
        messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        });
    });
    
    // 添加当前消息
    messages.push({ role: 'user', content: message });
    
    // 记录API请求
    const requestData = {
        model: settings.model,
        messages: messages,
        temperature: 0.7
    };
    
    logDebugEvent('api_request', {
        url: settings.apiUrl,
        model: settings.model,
        messageCount: messages.length,
        requestData: requestData
    });
    
    // 实现重试机制
    const maxRetries = 3;
    const errors = []; // 收集所有错误信息
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // 如果是重试，显示提示
            if (attempt > 0) {
                const retryMessage = document.createElement('div');
                retryMessage.className = 'system-message';
                retryMessage.textContent = `API请求失败，正在进行第${attempt}次重试...`;
                document.getElementById('chat-messages').appendChild(retryMessage);
                document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
                
                // 添加延迟，避免立即重试
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                const error = {
                    attempt: attempt + 1,
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    timestamp: new Date().toISOString()
                };
                
                errors.push(error);
                
                logDebugEvent('api_error', {
                    attempt: attempt + 1,
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText
                });
                
                // 如果不是最后一次尝试，继续重试
                if (attempt < maxRetries) {
                    continue;
                }
                
                // 最后一次尝试失败，抛出包含所有错误信息的异常
                const allErrors = errors.map(e => 
                    `尝试 ${e.attempt}: [${e.status}] ${e.statusText} - ${e.errorText}`
                ).join('\n');
                
                throw new Error(`API请求失败，已重试${maxRetries}次。所有错误信息：\n${allErrors}`);
            }
            
            const data = await response.json();
            const responseContent = data.choices[0].message.content;
            
            // 记录API响应
            logDebugEvent('api_response', {
                model: data.model,
                usage: data.usage,
                responsePreview: responseContent.substring(0, 200) + (responseContent.length > 200 ? '...' : ''),
                fullResponse: responseContent,
                attempt: attempt + 1
            });
            
            return responseContent;
        } catch (error) {
            // 如果是网络错误或其他非HTTP错误
            if (attempt < maxRetries) {
                const error = {
                    attempt: attempt + 1,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                errors.push(error);
                
                logDebugEvent('api_error', {
                    attempt: attempt + 1,
                    error: error.message,
                    stack: error.stack
                });
                
                continue; // 继续下一次重试
            }
            
            // 最后一次尝试失败，收集所有错误信息
            if (error.message.includes('API请求失败，已重试')) {
                // 已经是包含所有错误信息的错误，直接抛出
                throw error;
            } else {
                // 添加到错误列表
                errors.push({
                    attempt: attempt + 1,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                const allErrors = errors.map(e => 
                    `尝试 ${e.attempt}: ${e.error}`
                ).join('\n');
                
                const finalError = new Error(`API请求失败，已重试${maxRetries}次。所有错误信息：\n${allErrors}`);
                finalError.errors = errors;
                throw finalError;
            }
        }
    }
}

// 处理输入框回车事件
function handleInputKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 清空聊天记录
function clearChat() {
    if (!currentCharacterId) return;
    
    if (confirm('确定要清空与该角色的聊天记录吗？')) {
        // 从chatHistories中删除当前角色的聊天记录
        if (chatHistories[currentCharacterId]) {
            delete chatHistories[currentCharacterId];
            saveChatHistory(); // 保存到localStorage
        }
        
        // 清空当前聊天界面
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
}

// 显示添加角色界面
function showAddCharacter() {
    document.getElementById('character-name').value = '';
    document.getElementById('character-persona').value = '';
    document.getElementById('character-avatar').value = '';
    document.getElementById('character-avatar-file').value = '';
    document.getElementById('avatar-preview').innerHTML = '<span class="avatar-placeholder">暂无头像</span>';
    showScreen('add-character-screen');
}

// 处理头像上传
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        // 检查文件大小 (限制为2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarPreview = document.getElementById('avatar-preview');
            avatarPreview.innerHTML = `<img src="${e.target.result}" alt="头像预览">`;
            
            // 将图片数据存储到隐藏的输入框中
            document.getElementById('character-avatar').value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 获取模型列表
async function fetchModels() {
    const apiUrl = document.getElementById('api-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!apiUrl || !apiKey) {
        alert('请先填写API地址和API密钥');
        return;
    }
    
    // 显示加载状态
    const fetchButton = event.target;
    const originalText = fetchButton.textContent;
    fetchButton.textContent = '获取中...';
    fetchButton.disabled = true;
    
    try {
        // 从聊天完成URL构建模型列表URL
        let modelsUrl;
        if (apiUrl.includes('/chat/completions')) {
            modelsUrl = apiUrl.replace('/chat/completions', '/models');
        } else {
            // 如果不是标准格式，尝试添加/models
            modelsUrl = apiUrl.endsWith('/') ? apiUrl + 'models' : apiUrl + '/models';
        }
        
        const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.data || [];
        
        if (models.length === 0) {
            alert('未找到可用模型');
            return;
        }
        
        // 显示模型选择下拉框
        const modelListContainer = document.getElementById('model-list-container');
        const modelSelect = document.getElementById('model-select');
        const customInputContainer = document.querySelector('.model-custom-input-container');
        
        // 清空现有选项
        modelSelect.innerHTML = '<option value="">从列表中选择模型</option>';
        
        // 添加模型选项
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            modelSelect.appendChild(option);
        });
        
        // 添加"使用自定义模型"选项
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = '使用自定义模型';
        modelSelect.appendChild(customOption);
        
        // 显示下拉框
        modelListContainer.style.display = 'block';
        
        // 添加选择事件监听器
        modelSelect.onchange = function() {
            if (this.value === 'custom') {
                // 显示自定义输入框
                customInputContainer.style.display = 'flex';
                document.getElementById('api-model').value = '';
            } else if (this.value) {
                // 隐藏自定义输入框并清空自定义输入框内容
                customInputContainer.style.display = 'none';
                document.getElementById('custom-model').value = '';
                document.getElementById('api-model').value = this.value;
            } else {
                // 隐藏自定义输入框并清空自定义输入框内容
                customInputContainer.style.display = 'none';
                document.getElementById('custom-model').value = '';
            }
        };
        
    } catch (error) {
        console.error('获取模型列表出错:', error);
        alert(`获取模型列表失败: ${error.message}`);
    } finally {
        // 恢复按钮状态
        fetchButton.textContent = originalText;
        fetchButton.disabled = false;
    }
}

// 使用自定义模型
function useCustomModel() {
    const customModel = document.getElementById('custom-model').value.trim();
    if (!customModel) {
        alert('请输入自定义模型ID');
        return;
    }
    // 设置自定义模型ID，并重置下拉框选择
    document.getElementById('api-model').value = customModel;
    document.getElementById('model-select').value = '';
}

// 保存角色
function saveCharacter() {
    const name = document.getElementById('character-name').value.trim();
    const persona = document.getElementById('character-persona').value.trim();
    const avatar = document.getElementById('character-avatar').value.trim();
    
    if (!name) {
        alert('请输入角色名称');
        return;
    }
    
    const character = {
        id: Date.now().toString(),
        name: name,
        persona: persona || '你是一个友好的AI助手',
        avatar: avatar
    };
    
    characters.push(character);
    saveCharacters();
    renderCharacterList();
    showScreen('character-list-screen');
}

// 显示设置界面
function showSettings() {
    showScreen('settings-screen');
}

// 显示关于界面
function showAbout() {
    showScreen('about-screen');
}

// 显示提示词设置界面
function showPromptSettings() {
    // 提示词设置
    document.getElementById('role-play-prompt').value = settings.rolePlayPrompt;
    document.getElementById('enable-role-play').checked = settings.enableRolePlay;
    
    showScreen('prompt-settings-screen');
}

// 显示API设置界面
function showApiSettings() {
    // API设置
    document.getElementById('api-url').value = settings.apiUrl;
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('api-model').value = settings.model;
    
    // 新增的自定义参数
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('top-p').value = settings.topP;
    document.getElementById('context-count').value = settings.contextCount;
    
    // 重置模型列表状态
    const modelListContainer = document.getElementById('model-list-container');
    const customInputContainer = document.querySelector('.model-custom-input-container');
    const modelSelect = document.getElementById('model-select');
    const customModelInput = document.getElementById('custom-model');
    
    modelListContainer.style.display = 'none';
    customInputContainer.style.display = 'none';
    modelSelect.value = '';
    customModelInput.value = '';
    
    showScreen('api-settings-screen');
}

// 显示回复策略设置界面
function showReplySettings() {
    // 回复策略设置
    document.getElementById('enable-delay-send').checked = settings.enableDelaySend;
    document.getElementById('reply-delay').value = settings.replyDelay;
    document.getElementById('show-delay-hint').checked = settings.showDelayHint;
    
    showScreen('reply-settings-screen');
}

// 保存回复策略设置
function saveReplySettings() {
    // 获取设置值
    settings.enableDelaySend = document.getElementById('enable-delay-send').checked;
    settings.replyDelay = parseInt(document.getElementById('reply-delay').value);
    settings.showDelayHint = document.getElementById('show-delay-hint').checked;
    
    // 保存设置到本地存储
    saveSettings();
    
    // 返回设置界面
    showScreen('settings-screen');
    
    // 显示保存成功提示
    alert('回复策略设置已保存');
}

// 显示显示设置界面
function showDisplaySettings() {
    // 显示设置
    document.getElementById('fullscreen-toggle').checked = settings.fullscreen;
    document.getElementById('resolution-width').value = settings.resolution.split('x')[0];
    document.getElementById('resolution-height').value = settings.resolution.split('x')[1];
    
    showScreen('display-settings-screen');
}

// 切换选项卡
function switchTab(tabId) {
    // 移除所有选项卡的active类
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有内容的active类
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 添加active类到当前选项卡和内容
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'api-tab') {
        document.getElementById('api-settings').classList.add('active');
    } else if (tabId === 'display-tab') {
        document.getElementById('display-settings').classList.add('active');
    }
}

// 初始化全屏状态
function initFullscreen() {
    const phoneScreen = document.getElementById('phone-screen');
    const hiddenMenu = document.getElementById('hidden-menu');
    
    // 根据设置初始化全屏状态
    if (settings.fullscreen) {
        phoneScreen.classList.add('fullscreen');
        hiddenMenu.classList.remove('show');
    } else {
        phoneScreen.classList.remove('fullscreen');
        hiddenMenu.classList.add('show');
    }
    
    // 设置屏幕分辨率
    updateScreenResolution();
    
    // 初始化隐藏菜单事件
    initHiddenMenuEvents();
}

// 初始化隐藏菜单事件
function initHiddenMenuEvents() {
    // 添加菜单按钮事件
    const menuButtons = document.querySelectorAll('.menu-button');
    menuButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleMenuAction(action);
        });
    });
}

// 处理菜单操作
function handleMenuAction(action) {
    switch(action) {
        case 'toggle-fullscreen':
            // 切换全屏设置
            const fullscreenToggle = document.getElementById('fullscreen-toggle');
            fullscreenToggle.checked = !fullscreenToggle.checked;
            toggleFullscreen();
            break;
        case 'home':
            showScreen('home-screen');
            break;
        case 'characters':
            showCharacterList();
            break;
        case 'chat':
            if (characters.length > 0) {
                openChat(characters[0].id);
            } else {
                alert('请先添加角色');
            }
            break;
        case 'settings':
            showSettings();
            break;
        default:
            console.log('未知操作:', action);
    }
}

// 切换全屏
function toggleFullscreen() {
    const phoneScreen = document.getElementById('phone-screen');
    const hiddenMenu = document.getElementById('hidden-menu');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    
    if (fullscreenToggle.checked) {
        phoneScreen.classList.add('fullscreen');
        hiddenMenu.classList.remove('show');
        settings.fullscreen = true;
    } else {
        phoneScreen.classList.remove('fullscreen');
        hiddenMenu.classList.add('show');
        settings.fullscreen = false;
    }
    
    saveSettingsToStorage();
}

// 更新屏幕分辨率
function updateScreenResolution() {
    const phoneScreen = document.getElementById('phone-screen');
    const width = settings.resolution.split('x')[0];
    const height = settings.resolution.split('x')[1];
    
    // 更新CSS变量
    document.documentElement.style.setProperty('--screen-width', `${width}px`);
    document.documentElement.style.setProperty('--screen-height', `${height}px`);
    document.documentElement.style.setProperty('--aspect-ratio', settings.aspectRatio);
    
    // 更新分辨率输入框
    const widthInput = document.getElementById('resolution-width');
    const heightInput = document.getElementById('resolution-height');
    
    if (widthInput && heightInput) {
        widthInput.value = width;
        heightInput.value = height;
    }
    
    // 更新比例选择器
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    if (aspectRatioSelect) {
        // 检查是否有匹配的预设比例
        const presetRatios = ['16/9', '18/9', '21/9', '4/3', '1/1'];
        let matchedRatio = false;
        
        for (const ratio of presetRatios) {
            const [num, den] = ratio.split('/');
            if (Math.abs((width/height) - (num/den)) < 0.01) {
                aspectRatioSelect.value = ratio;
                matchedRatio = true;
                break;
            }
        }
        
        if (!matchedRatio) {
            aspectRatioSelect.value = 'custom';
        }
    }
}

// 应用分辨率设置
function applyResolutionSettings() {
    const width = document.getElementById('resolution-width').value.trim() || '3200';
    const height = document.getElementById('resolution-height').value.trim() || '1440';
    
    // 验证输入
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert('请输入有效的分辨率值');
        return false;
    }
    
    settings.resolution = `${width}x${height}`;
    
    // 更新屏幕比例
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    if (aspectRatioSelect.value === 'custom') {
        settings.aspectRatio = `${width}/${height}`;
    } else {
        settings.aspectRatio = aspectRatioSelect.value;
    }
    
    // 应用设置
    updateScreenResolution();
    saveSettingsToStorage();
    
    return true;
}

// 切换隐藏菜单
function toggleHiddenMenu() {
    const hiddenMenu = document.getElementById('hidden-menu');
    hiddenMenu.classList.toggle('show');
}

// 保存提示词设置
function savePromptSettings() {
    // 保存旧设置值用于比较
    const oldSettings = { ...settings };
    
    // 提示词设置
    settings.rolePlayPrompt = document.getElementById('role-play-prompt').value.trim() || '请你扮演一个角色，严格按照以下设定进行对话和回应：';
    settings.enableRolePlay = document.getElementById('enable-role-play').checked;
    
    // 多消息输出设置
    settings.enableMultiMessage = document.getElementById('enable-multi-message').checked;
    settings.multiMessageSeparator = document.getElementById('multi-message-separator').value.trim() || '@@@@';
    
    saveSettingsToStorage();
    
    // 记录设置变更
    const changedSettings = {};
    for (const key in settings) {
        if (oldSettings[key] !== settings[key]) {
            changedSettings[key] = {
                old: oldSettings[key],
                new: settings[key]
            };
        }
    }
    
    if (Object.keys(changedSettings).length > 0) {
        logDebugEvent('settings_change', {
            category: 'prompt_settings',
            changes: changedSettings
        });
    }
    
    alert('提示词设置已保存');
    showScreen('settings-screen');
}

// 保存设置
function saveSettings() {
    // 保存旧设置值用于比较
    const oldSettings = { ...settings };
    
    // API设置
    settings.apiUrl = document.getElementById('api-url').value.trim() || 'https://api.openai.com/v1/chat/completions';
    settings.apiKey = document.getElementById('api-key').value.trim();
    settings.model = document.getElementById('api-model').value.trim() || 'gpt-3.5-turbo';
    
    // 新增的自定义参数
    settings.temperature = parseFloat(document.getElementById('temperature').value) || 0.8;
    settings.topP = parseFloat(document.getElementById('top-p').value) || 0.9;
    settings.contextCount = parseInt(document.getElementById('context-count').value) || 20;
    
    // 显示设置
    settings.fullscreen = document.getElementById('fullscreen-toggle').checked;
    
    // 应用分辨率设置
    if (!applyResolutionSettings()) {
        return; // 如果分辨率验证失败，不保存
    }
    
    // 应用设置
    initFullscreen();
    
    // 保存所有设置到本地存储
    saveSettingsToStorage();
    
    // 记录设置变更
    const changedSettings = {};
    for (const key in settings) {
        if (oldSettings[key] !== settings[key]) {
            changedSettings[key] = {
                old: oldSettings[key],
                new: settings[key]
            };
        }
    }
    
    if (Object.keys(changedSettings).length > 0) {
        logDebugEvent('settings_change', {
            category: 'general_settings',
            changes: changedSettings
        });
    }
    
    alert('设置已保存');
    showScreen('home-screen');
}

// 本地存储相关函数
function saveCharacters() {
    localStorage.setItem('LiunianPhone-characters', JSON.stringify(characters));
}

function loadCharacters() {
    const saved = localStorage.getItem('LiunianPhone-characters');
    if (saved) {
        characters = JSON.parse(saved);
    }
}

function saveChatHistory() {
    localStorage.setItem('LiunianPhone-chat-history', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const saved = localStorage.getItem('LiunianPhone-chat-history');
    if (saved) {
        chatHistory = JSON.parse(saved);
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('LiunianPhone-settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('LiunianPhone-settings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
    }
}

// 显示编辑角色模态框
function showEditCharacterModal() {
    const character = characters.find(c => c.id === currentCharacterId);
    if (!character) return;
    
    // 填充表单数据
    document.getElementById('edit-character-name').value = character.name || '';
    document.getElementById('edit-character-persona').value = character.persona || '';
    
    // 设置头像预览
    const avatarPreview = document.getElementById('edit-avatar-preview');
    if (character.avatar) {
        avatarPreview.innerHTML = `<img src="${character.avatar}" alt="头像预览">`;
    } else {
        avatarPreview.innerHTML = '<span class="avatar-placeholder">暂无头像</span>';
    }
    
    // 清空文件输入框
    document.getElementById('edit-character-avatar-file').value = '';
    document.getElementById('edit-character-avatar').value = character.avatar || '';
    
    // 显示模态框
    document.getElementById('edit-character-modal').classList.add('visible');
}

// 关闭编辑角色模态框
function closeEditCharacterModal() {
    document.getElementById('edit-character-modal').classList.remove('visible');
}

// 处理编辑头像上传
function handleEditAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        // 检查文件大小 (限制为2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarPreview = document.getElementById('edit-avatar-preview');
            avatarPreview.innerHTML = `<img src="${e.target.result}" alt="头像预览">`;
            
            // 将图片数据存储到隐藏的输入框中
            document.getElementById('edit-character-avatar').value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 保存编辑的角色
function saveEditedCharacter() {
    const character = characters.find(c => c.id === currentCharacterId);
    if (!character) return;
    
    const name = document.getElementById('edit-character-name').value.trim();
    const persona = document.getElementById('edit-character-persona').value.trim();
    const avatar = document.getElementById('edit-character-avatar').value.trim();
    
    if (!name) {
        alert('请输入角色名称');
        return;
    }
    
    // 更新角色信息
    character.name = name;
    character.persona = persona || '你是一个友好的AI助手';
    character.avatar = avatar;
    
    // 保存并更新界面
    saveCharacters();
    updateChatHeader();
    renderCharacterList();
    
    // 关闭模态框
    closeEditCharacterModal();
    
    alert('角色信息已保存');
}

// 更新聊天头部
function updateChatHeader() {
    const character = characters.find(c => c.id === currentCharacterId);
    if (character) {
        document.getElementById('chat-character-name').textContent = character.name;
    }
}

// 清空当前角色的聊天记录
function clearCurrentCharacterChat() {
    if (!currentCharacterId) return;
    
    // 确认操作
    if (!confirm('确定要清空当前角色的所有聊天记录吗？此操作不可撤销。')) {
        return;
    }
    
    // 从chatHistories中删除当前角色的聊天记录
    if (chatHistories[currentCharacterId]) {
        delete chatHistories[currentCharacterId];
        saveChatHistory(); // 保存到localStorage
    }
    
    // 清空当前聊天界面
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // 关闭模态框
    closeEditCharacterModal();
    
    alert('聊天记录已清空');
}