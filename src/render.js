const { ipcRenderer } = require('electron');
const path = require('path');
const { getCurrentWindow, app } = require('@electron/remote');
const Db = require('./storeDb');

const db = new Db(app);

currentType = 'PRODUCTIVE_TIME',
lastType = null;
shortPauseTime = 5,
longPauseTime = 15,
productiveTime = 25,
autoBreak = false,
autoPomo = false,
clock = document.getElementById('clock'),
startOrResumeButton = document.getElementById('startOrResume'),
pauseButton = document.getElementById('pause'),
stopButton = document.getElementById('stop'),
currentTime = '0:00',
state = '',
timeLeft = 0,
timePassed = 0,
currentTimeLimit = 0,
FULL_DASH_ARRAY = 283,
version= document.getElementById('version'),
historyName = 'HS_CLOCK',
taskName = 'TASK_DATA',
historyData = localStorage.getItem(historyName) != null ? JSON.parse(localStorage.getItem(historyName)) : [],
tasksData =  [],
currentTitle = document.title,
countDownTime = null,
notification = false,
historyDiv = document.getElementById('history'),
playing = false,
timing = null;

db.initiateDb(async () => {
    await setConfigs();
    renderTasks();
    renderData();
});

// checkData();


 async function setConfigs() {
    let result = await db.database.exec(`SELECT rowid AS id, * FROM configs WHERE rowid = 1`);
    result =  parseArrayObject(result);
    shortPauseTime = result[0].break_time;
    longPauseTime = result[0].longbreak_time;
    productiveTime = result[0].focus_time;

    document.getElementById('productiveTime').value = productiveTime;
    document.getElementById('shortPauseTime').value = shortPauseTime;
    document.getElementById('longPauseTime').value = longPauseTime;

    valuesChanges();

    autoBreak = result[0].auto_break == 1 ? true : false;
    autoPomo = result[0].auto_pomo == 1 ? true : false;

    if(autoBreak)  document.getElementById('autoBreak').setAttribute('checked','');
    if(autoPomo) document.getElementById('autoPomo').setAttribute('checked','');

    updateType();
    renderTypes();
 }

 function valuesChanges(){
    document.getElementById('autoBreak').addEventListener('change', e => {
        autoBreak = e.target.checked;
        updateSettings();
    })
    document.getElementById('autoPomo').addEventListener('change', e => {
        autoPomo = e.target.checked;
        updateSettings();
    })

    document.getElementById('productiveTime').addEventListener('change', e => {
        e.preventDefault();
        renderTypes();
        productiveTime = e.target.value;
        updateSettings();
    })

    document.getElementById('shortPauseTime').addEventListener('change', e => {
        e.preventDefault();
        renderTypes();
        shortPauseTime = e.target.value;
        updateSettings();
    })

    document.getElementById('longPauseTime').addEventListener('change', e => {
        e.preventDefault();
        renderTypes();
        longPauseTime = e.target.value;
        updateSettings();
    })

    document.getElementById('productiveTime').addEventListener('keyup', e => {
        e.preventDefault();
        renderTypes();
        productiveTime = e.target.value;
        updateSettings();
    })

    document.getElementById('shortPauseTime').addEventListener('keyup', e => {
        e.preventDefault();
        renderTypes();
        shortPauseTime = e.target.value;
        updateSettings();
    })

    document.getElementById('longPauseTime').addEventListener('keyup', e => {
        e.preventDefault();
        renderTypes();
        longPauseTime = e.target.value;
        updateSettings();
    })
 }

 function updateSettings(){
     db.database.run(`UPDATE configs SET focus_time = ${productiveTime}, break_time = ${shortPauseTime}, longbreak_time = ${longPauseTime}, auto_break = ${autoBreak}, auto_pomo = ${autoPomo} WHERE rowid = 1;`);
     db.exportDb();
 }

 function openSettings(){
    document.getElementById('settings').classList.add('show');
 }

 function closeSettings(){
    document.getElementById('settings').classList.remove('show');
 }

 function addTask(data = {
     text: '',
     check: false,
     created_at: new Date().toISOString()
 }) {
    tasksData = getTasks();
    tasksData.push(data);
    localStorage.setItem(taskName,JSON.stringify(tasksData));
 }

 function checkTask(index) {
    tasksData = getTasks();
    tasksData[index].checked = tasksData[index].checked == 1 ? 0 : 1;
    db.database.run(`UPDATE tasks SET checked = ${tasksData[index].checked} WHERE rowid = ${tasksData[index].id}`);
    db.exportDb();
    renderTasks();
 }

 function sendTask(){
     let text = document.getElementById('text').value;
    
     if(text){
        document.getElementById('text').value = '';
        db.database.run(`INSERT INTO tasks (title,note,est_pomo,checked,total_pomo,created_at) VALUES 
            ('${text}', '', 0, 0, 0, datetime('now'))`);
        addTask({
            title: text,
            note: '',
            check: 0,
            total_pomo: 0,
            est_pomo: 0,
            created_at: new Date().toDateString()
        });
        db.exportDb();
        renderTasks();
     }
 }

 function removeTask(id) {
     let index = tasksData.findIndex(x => x.id == id);
    tasksData.splice(index, 1);
    db.database.run(`DELETE FROM tasks WHERE rowid = ${id}`);
    db.exportDb();
    renderTasks();
 }

 function getTasks() {
    let result  = db.database.exec(`SELECT rowid AS id, title,
    note,
    est_pomo,
    total_pomo, created_at, checked FROM tasks`);
    return parseArrayObject(result);
 }

 function parseArrayObject(result) {
     let array = [];
     if(result.length > 0){
        let columns = result[0].columns;
        let values = result[0].values;
        if(columns.length && values.length > 0){
           for (const value of values) {
               let object = {};
               for (const [i, v] of value.entries()) {
                   object[columns[i]] = v;
               }
               array.push(object);
           }
       }
     }
    return array;
 }

 function renderTasks(){
    tasksData = getTasks();
    let html = ``;
    if(tasksData.length > 0){
        for (const [i, v] of tasksData.entries()) {
            let time = new Date(v.created_at)
            html += `\n
            <div class="task ${v.checked == 1 ? 'checked' : ''}" onclick="checkTask(${i})">
                <span class="time">${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()} ${time.getHours()}:${time.getMinutes()}</span>
                <span class="task-text">${v.title}</span>
                <buttton class="btn-remove-task" type="button" onclick="removeTask(${v.id})"></buttton>
            </div>
            `
        }
    } else {
        html = `
            <div class="empyt">
                Não há nenhuma task no momento.</br>
                Adicione uma task!
            </div>
        `;
    }
    document.getElementById('tasks').innerHTML = html;
 }

 function getHistory() {
    let result = db.database.exec(`SELECT rowid, * FROM logs;`)
    return parseArrayObject(result);
 }

//  function checkData() {
//     historyData =  getHistory();
//     if(historyData.length > 0){
//         let time = new Date(historyData[historyData.length-1].time_start);
//         let dateNow = new Date();
//         if(time.getDate() != dateNow.getDate() && time.getMonth() != dateNow.getMonth() && time.getFullYear() != dateNow.getFullYear()){
//             localStorage.removeItem(historyName);
//             return;
//         } else return;
//     }
//     return;
//  }

function renderData() {
    historyData =  getHistory();
    let html = ``;
    if(historyData.length > 0){
        for (const data of historyData) {
            let timeStart = new Date(data.time_start);
            let timeEnd = new Date(data.time_end);
            let type = '';
            if(data.type_current == 'PRODUCTIVE_TIME') {
                type = 'Tempo focado'
            } else if(data.type_current == 'SHORT_PAUSE_TIME'){
                type = 'Pausa curta'
            } else {
                type = 'Pausa longa'
            }
            html += `\n
            <div class="history-item">
                <span class="time">${timeStart.getDate()+'/'+(timeStart.getMonth()+1)+'/'+timeStart.getFullYear()} - ${timeStart.getHours()}:${timeStart.getMinutes()} à ${timeEnd.getHours()}:${timeEnd.getMinutes()}</span>
                <span class="type">${type}</span>
            </div>
            `;
        }
    } else {
        html = `
            <div class="empyt">
                Nenhum registro no histórico no momento.</br>
                Comece a concluir os tempos para aparecer aqui!
            </div>
        `;
    }

    historyDiv.innerHTML = html;
}

function setHistoryData(data){
    db.database.run(`INSERT INTO logs (pomo_day, time_start, time_end, type_current) VALUES (
        datetime('now'),
        datetime('${countDownTime.toISOString()}'),
        datetime('now'),
        "${data.type}"
    );`);
    db.exportDb();
}

function deleteHistoryData(index){
    historyData =  getHistory();
    delete historyData[i];
    localStorage.setItem(historyName, JSON.stringify(historyData))
}

 function showNotification(title, body){
    return ipcRenderer.invoke('notification', { title, body })
 }

function renderTypes() {
    let types = document.getElementById('types');
    for (let i = 0; i < types.children.length; i++) {
        let children = types.children.item(i);
        children.style.display = "none";
    }
    if(state == 'FINISHED' || state == ''){
        switch(currentType) {
            case 'PRODUCTIVE_TIME':
                document.getElementById('PRODUCTIVE_TIME').style.display = 'block';
                document.getElementById('clock').innerHTML = `${productiveTime}:00`;
                break;
            case 'SHORT_PAUSE_TIME':
                document.getElementById('SHORT_PAUSE_TIME').style.display = 'block';
                document.getElementById('clock').innerHTML = `${shortPauseTime}:00`;
                break;
            case 'LONG_PAUSE_TIME':
                document.getElementById('LONG_PAUSE_TIME').style.display = 'block';
                document.getElementById('clock').innerHTML = `${longPauseTime}:00`;
                break;
        }
    }
}

function startOrResume(auto = false){
    switch (state){
        case '':
            start(auto);
            break;
        case 'FINISHED':
            start(auto);
            break;
        case 'PAUSED':
            resume();
            break;
    }
}

function start(auto = false) {
    countDownTime = new Date();

    switch (currentType){
        case 'PRODUCTIVE_TIME':
            let begin = () => {
                currentTimeLimit = productiveTime * 60;
                startClock();
                timePassed = 0;
                lastType = currentType;
                state = 'TIMING';
            }
            if(auto && autoPromo){
                begin();
                showNotification(`Seu tempo de foco começou, você tem ${productiveTime}min.`)
            } else if(!auto){
                begin()
            }
            break;
        case 'SHORT_PAUSE_TIME':
            let beginPause = () => {
                currentTimeLimit = shortPauseTime * 60;
                startClock();
                timePassed = 0;
                lastType = currentType;
                state = 'TIMING';
            }
            if(auto && autoBreak){
                beginPause();
                showNotification(`Seu tempo de pausa começou, você tem ${shortPauseTime}min.`)
            } else if(!auto){
                beginPause();
            }
            break;
        case 'LONG_PAUSE_TIME':
            currentTimeLimit = longPauseTime * 60;
            startClock();
            timePassed = 0;
            lastType = currentType;
            state = 'TIMING';
            if(auto){
                showNotification(`Sua pausa longa começou, você tem ${longPauseTime}min.`)
            }
            break;
    }
    ipcRenderer.invoke('stateChange', state);
    startOrResumeButton.style.display = 'none';
    pauseButton.style.display = 'block';
    stopButton.style.display = 'block';

}

function resume() {
    startOrResumeButton.style.display = 'none';
    startOrResumeButton.innerText = 'Iniciar';
    pauseButton.style.display = 'block';
    state = 'TIMING';
    ipcRenderer.invoke('stateChange', state);
    startClock();
}

function pause() {
    clearInterval(timing);
    updateClockToTime();
    startOrResumeButton.innerText = 'Resumir';
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    state = 'PAUSED';
    ipcRenderer.invoke('stateChange', state);
    document.title = `PAUSADO | ${currentTitle}`;
}

function startClock() {
    timing = setInterval(() => {
        updateClockToTime();
    }, 1000);
}

function eventFinish() {
    setHistoryData({
        type: currentType,
        time_start: countDownTime,
        time_end: new Date()
    });
    renderData();
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    stopButton.style.display = 'none';
    document.title = currentTitle;
    state = 'FINISHED';
    ipcRenderer.invoke('stateChange', state);
    if(autoBreak || autoPomo){
        updateType(true, true);
        startOrResume(true);
    } else {
        updateType(true);
    }
}

function updateType(notification = false, auto = false) {
    // historyData = this.getHistory();
    lastType = historyData[historyData.length-1]?.type_current;
    if(lastType){
        currentType = getNextType();
    } else {
        currentType = 'PRODUCTIVE_TIME';
    }
    if(notification && !auto){
        switch(currentType){
            case 'PRODUCTIVE_TIME':
                showNotification(`Tempo de pausa acabou, hora de focar por ${productiveTime}min.`);
                break;
            case 'LONG_PAUSE_TIME':
                showNotification(`Tempo de focar acabou, hora de uma pausa longa de ${longPauseTime}min.`);
                break;
            case 'SHORT_PAUSE_TIME':
                showNotification(`Tempo de focar acabou, hora de pausar por ${shortPauseTime}min.`);
                break;
        }
    }
    renderTypes();
}

function getNextType() {
    if(lastType == 'PRODUCTIVE_TIME'){
        historyData = getHistory();
        let data = [];
        if(historyData.length >= 7){
            let total = historyData.length > 7 ? historyData.length-7 : 0;
            for (let i = total; i < total+7; i++) {
                data.push(historyData[i]);
            }
            if(data.filter(x => x.type_current == 'SHORT_PAUSE_TIME').length >= 3){
                return 'LONG_PAUSE_TIME';  
            } else {
                return 'SHORT_PAUSE_TIME';
            }
        } else {
            return 'SHORT_PAUSE_TIME';
        }
    } else if(lastType == 'SHORT_PAUSE_TIME' || lastType == 'LONG_PAUSE_TIME') {
        if(lastType == 'LONG_PAUSE_TIME') {
            shortPauses = 0;
        }
       return 'PRODUCTIVE_TIME';
    }
}

function stopAll() {
    clearInterval(timing);
    clock.innerHTML = currentTime;
    startOrResumeButton.innerText = 'Iniciar';
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    stopButton.style.display = 'none';
    state = 'FINISHED';
    renderTypes();
    currentTimeLimit = 0;
    timePassed = 0;
    timeLeft = 0;
    document.title = currentTitle;
    ipcRenderer.invoke('stateChange', state);
}

async function updateClockToTime(){
    timePassed = timePassed += 1;
    timeLeft = currentTimeLimit - timePassed;
    
    setCircleDasharray();

    // let minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    // let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;

    if(minutes == 5 && seconds == 0){
        showNotification('Restam 5min para concluir o relógio.');
    }

    if(minutes <= 0 && seconds <= 3) {
        if(!playing){
            playing = true;
            let audio = new Audio('./assets/audio/mixkit-simple-countdown-922.wav');
            await audio.play();
        }
    }

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }
  
    currentTime = `${minutes}:${seconds}`;
    clock.innerHTML = currentTime;

   
    document.title = `${currentTime} | ${currentTitle}`;

    if (timeLeft < 0) {
        clearInterval(timing);
        currentTime = '0:00';
        clock.innerHTML = currentTime;
        playing = false;
        eventFinish();
    }
}




// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();

        ipcRenderer.on('start', e => {
            startOrResume();
        });

        ipcRenderer.on('stop', e => {
            stopAll();
        })
        
        ipcRenderer.on('pause', e => {
            pause();
        })

        
    

        ipcRenderer.on('update-available', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'block';
        })

        ipcRenderer.on('update-not-available', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
        })
        
    
        ipcRenderer.on('update-downloaded', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
            document.getElementById('newUpdate2').style.display = 'block';
            document.getElementById('progressBar').style.display = 'none'
        })

        ipcRenderer.on('error', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
            document.getElementById('newUpdate2').style.display = 'none';
            document.getElementById('errorUpdate').style.display = 'none'
        })
        
  
    }
};

function quitAndInstall() {
    ipcRenderer.invoke('quitAndInstall');
} 

window.onbeforeunload = (event) => {

    ipcRenderer.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        // ipcRenderer.minimize();
        // ipcRenderer.invoke('minimize');
        getCurrentWindow().minimize();
        // BrowserWindow.getFocusedWindow().minimize();
    });
    
    document.getElementById('max-button').addEventListener("click", event => {
        getCurrentWindow().maximize();
        // ipcRenderer.invoke('maxOrUnmax');
    });

    document.getElementById('restore-button').addEventListener("click", event => {
     
        getCurrentWindow().unmaximize();
        
    });

    ipcRenderer.on('version', (event, text) => {
        version.innerText = text
     })

    document.getElementById('close-button').addEventListener("click", event => {
        // win.close();
        getCurrentWindow().hide();
    });

    getCurrentWindow().on('resize', toggleMaxRestoreButtons)
    

    function toggleMaxRestoreButtons(e, data) {
        if(getCurrentWindow().isMaximized()) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}




// Credit: Mateusz Rybczonec






function calculateTimeFraction() {
  const rawTimeFraction = timeLeft / currentTimeLimit;
  return rawTimeFraction - (1 / currentTimeLimit) * (1 - rawTimeFraction);
}

function setCircleDasharray() {
  const circleDasharray = `${(
    calculateTimeFraction() * FULL_DASH_ARRAY
  ).toFixed(0)} 283`;
  document
    .getElementById("base-timer-path-remaining")
    .setAttribute("stroke-dasharray", circleDasharray);
}