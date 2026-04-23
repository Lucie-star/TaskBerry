// ===============================
// HOW TO SET THIS UP THE FIRST TIME 
// ===============================
// 1. Install Node.js: https://nodejs.org
// 2. Open VS Code
// 3. Open a terminal and run:
//    npm create vite@latest TaskBerry -- --template react 
// 4. cd TaskBerry
// 5. npm install
// 6. Install confetti library: npm install canvas-confetti
// 7. Code in src/App.jsx
// 8. Run: npm run dev
// 9. Open the local URL in browser (usually http://localhost:5173)

import { useState, useEffect, useRef } from "react"; // importing React hooks: 
// useState for managing state and storing data (like tasks, timer, streaks),
// useEffect runs code when something changes, like saving to localStorage or 
// updating timer, 
// useRef store values that don't trigger re-renders when updated 
// (like timer interval ID or notification flags)

import confetti from "canvas-confetti"; // library to trigger confetti animation
import background from "./assets/background.png"; //vertical background import 
import TaskBerry from "./assets/TaskBerry.svg"; //title svg import 
import Star from "./assets/Star.svg"; //star icon import 
import LeftBerry from "./assets/LeftBerry.svg"; //left berry icon import
import RightBerry from "./assets/RightBerry.svg"; //right berry icon import   
import catSprite from "./assets/cat-sprite.png"; //cat sprite sheet import
import book_sheet from "./assets/book_sheet.png"; //book sprite sheet import

function Fireflies() { //defines a React component for the animated fireflies 
// in the background (resusable UI block)

//create state called fireflies, [] means we are NOT updating it later 
//()=>{..} is a lazy initializer, tells React to only run the code on startup 
  const [fireflies] = useState(() => 
    Array.from({ length: 25 }).map(() => ({ //Creates an array of 25 fireflies with random properties for animation
      left: Math.random() * 100, //random horizontal position (1-100%) 
      delay: Math.random() * 10, //random delay before animation starts (0-10s) to create a natural staggered effect
      duration: 12 + Math.random() * 10, //random animation speed (12-22s) to make some fireflies move faster than others
      size: 4 + Math.random() * 8 //random size (4-12px) to add variety to the fireflies
      //Math.random() generates a random decimal number between 0 (inclusive) and 1 (exclusive)
})));

  return (
    <> {/*React fragment to return multiple elements without adding 
    extra wrapper element (like a <div>) to the DOM, used when we just need to group
    elements but don't want to affect layout or HTML structure (acts as an invisible
    wrapper*/}
      {fireflies.map((f, i) => ( //Loops through all fireflies, f=firefly object,
      //i=index
      //map() creates a new array by transforming each element of the original 
      // array using the provided function, in this case we are transforming each 
      // firefly object into a <div> element with specific styles for animation 
      // and appearance
        <div
          key={i} //React requires a unique key for each element in a list to help 
          // it efficiently update and manage the DOM when the list changes.
          //key is a special prop in React that helps identify which 
          // items have changed, are added, or removed, acts like a unique ID for each
          // item. Using index as key is generally not recommended if the list can 
          // change order or have items added/removed, but in this case since 
          // fireflies are static and only created once on startup, it's acceptable
          className="firefly"
          style={{
            left: `${f.left}%`, //position firefly randomly horizontally
            bottom: "-20px", //start slightly below the bottom of the screen so 
            // they float up into view
            width: f.size, //random width based on size property
            height: f.size, //random height based on size property
            animationDuration: `${f.duration}s`, //random animation duration for 
            // floating up
            animationDelay: `${f.delay}s`, //random delay before animation starts 
            // to create a natural staggered effect
          }}
        />
      ))}
    </>
  );
}

export default function App() {
  // ========================
  // STATE
  // ========================

  // List of tasks, saved in localStorage so they persist across reloads 
  const [tasks, setTasks] = useState(() => { 
    const saved = localStorage.getItem("tasks"); //reading from browser's memory
    return saved ? JSON.parse(saved) : []; 
    //saved tasks were saved as string since localStorage only stores strings (check useEffects below)
    //so parse converts it back to javascript array for it to load 
  });

  // Task currently being focused with timer
  const [activeTask, setActiveTask] = useState(null);

  // Time left for current focus session (in seconds)
  const [timeLeft, setTimeLeft] = useState(0);

  // Whether the focus timer is running
  const [timerRunning, setTimerRunning] = useState(false);

  // ========================
  // WEEKLY FOCUS TRACKING (resets every Monday)
  // ========================

  // Helper function: get the Date of THIS week's Monday
  function getMonday(date) { //input date parameter expects a Date object 
    const d = new Date(date); //creates a copy of the inputted date 
    const day = d.getDay();   //gets day of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = (day === 0 ? -6 : 1) - day; //gives how many days to move to reach 
    // monday (if sunday, use -6, otherwise, use 1, then subtract current day to get
    // the difference)
    d.setDate(d.getDate() + diff); //updates the copy of the date to the monday 
    // date (26th to 22nd for example at midnight)
    d.setHours(0, 0, 0, 0); //ensures all mondays are exactly the same time 
    // 00:00:00:000 (midnight)
    return d; //returns the monday date 
  }

  const [weeklyData, setWeeklyData] = useState(() => { //stores weekly focus count
    const saved = localStorage.getItem("weeklyFocus"); //load saved weekly progress
    const currentMonday = getMonday(new Date()).toISOString(); //passes current date
      // into getMonday then converts it to a string
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.monday !== currentMonday) { //if saved data from different week, 
      // reset 
        return { monday: currentMonday, count: 0 }; //count is a property in a 
        //JavaScript objects that we define to keep track of how many focus sessions
        // completed this week
      }
      return parsed; //keep saved data if from the same week 
    }
    return { monday: currentMonday, count: 0 }; //if nothing saved (first time using
    // app, start fresh)
  });

  // Ref to store timer interval so we can clear it
  const timerRef = useRef(null);

  // Ref for storing notification flags for tasks
  const notificationRef = useRef({});

  //Ref for progress circle position 
  const progressCircleRef = useRef(null);

  // Draggable timer initial position state
  const [timerPos, setTimerPos] = useState({ x: 650, y: 690 });

  // Dragging state for timer popup
  const dragRef = useRef({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Keep track of total tasks for progress bar logic
  const [totalTasksEver, setTotalTasksEver] = useState(tasks.length);

  // Sparkles for progress bar animation
  const [sparkles, setSparkles] = useState([]);

  // ========================
  // SAVE TASKS TO LOCAL STORAGE
  // ========================
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks)); 
    if (tasks.length > totalTasksEver) setTotalTasksEver(tasks.length);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("streak", JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    localStorage.setItem("weeklyFocus", JSON.stringify(weeklyData));
  }, [weeklyData]);

  // ========================
  // TIMER LOGIC
  // ========================
  useEffect(() => {
    if (!timerRunning || !activeTask) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerRunning, activeTask]);

  // Watch for timeLeft reaching 0 to handle timer end
  useEffect(() => {
    if (timeLeft === 0 && activeTask) {
      setTimerRunning(false);
      setStreak(s => s + 1);
      setWeeklyData(prev => {
        const currentMonday = getMonday(new Date()).toISOString();
        if (prev.monday !== currentMonday) return { monday: currentMonday, count: 1 };
        return { ...prev, count: prev.count + 1 };
      });
      triggerConfetti();
      setActiveTask(null);
    }
  }, [timeLeft, activeTask]);

  // ========================
  // TASK FUNCTIONS
  // ========================

  function addTask(name, deadline) {
    const newTask = {
      id: Date.now(),
      name,
      deadline,
      completed: false
    };
    setTasks([...tasks, newTask]);
    notificationRef.current[newTask.id] = { twoDays: false, fiveDays: false, tenHalfDays: false };
  }

  function deleteTask(id) {
    setTasks(tasks.filter(t => t.id !== id));
    delete notificationRef.current[id];
  }

  function startFocus(task, durationMinutes = 50) { {/*change to 50 later */}
    setActiveTask(task);
    setTimeLeft(durationMinutes * 60);
    setTimerRunning(true);
  }

  function pauseTimer() {
    setTimerRunning(false);
  }

  function stopTimer() {
    setTimerRunning(false);
    setTimeLeft(0);
    setActiveTask(null);
  }

  function completeTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    triggerConfetti();
    createSparkles(id);

    const remaining = tasks.filter(t => t.id !== id && !t.completed).length;
    if (remaining === 0) {
      setTimeout(() => {
        setTasks([]);
        setTotalTasksEver(0);
      }, 500);
    }
  }

  // ========================
  // CONFETTI FUNCTION
  // ========================
  function triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff69b4", "#32cd32", "#ffa500", "#ff4c4c", "#8a2be2"],
    });
  }

  // ========================
  // SPARKLES FOR PROGRESS BAR
  // ========================
  function createSparkles(taskId) {
    const newSparkles = [];
    for (let i = 0; i < 5; i++) {
      newSparkles.push({
        id: Date.now() + Math.random(),
        left: Math.random() * 100,
        top: Math.random() * 20,
      });
    }
    setSparkles(prev => [...prev, ...newSparkles]);
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => !newSparkles.includes(s)));
    }, 800);
  }

  // ========================
  // PRIORITY COLOR CODING BASED ON DEADLINE
  // ========================
  function getPriorityColor(deadline) {
    const today = new Date();
    const dueDate = new Date(deadline);
    const diff = (dueDate - today) / (1000 * 60 * 60 * 24);
    if (diff <0) return "#a56363d8"; //overdue 
    if (diff < 3) return "#c68282d4"; //urgent
    if (diff <= 7) return "#d8ae61ce"; //medium priority
    return "#aed4bfcc"; //safe 
  }

  // ========================
  // SORT TASKS BY DEADLINE
  // ========================
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // ========================
  // TIMER DISPLAY VARIABLES
  // ========================
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // ========================
  // DRAGGABLE TIMER LOGIC
  // ========================
  function onMouseDown(e) {
    dragRef.current.isDragging = true;
    dragRef.current.offsetX = e.clientX - timerPos.x;
    dragRef.current.offsetY = e.clientY - timerPos.y;
  }

  function onMouseMove(e) {
    if (!dragRef.current.isDragging) return;
    setTimerPos({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY
    });
  }

  function onMouseUp() {
    dragRef.current.isDragging = false;
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ========================
  // PROGRESS BAR LOGIC
  // ========================
  const completedTasks = tasks.filter(t => t.completed).length;

  useEffect(() => {
    if (tasks.length > 0 && completedTasks === tasks.length) {
      setTimeout(() => {
        setTasks([]);
        setTotalTasksEver(0);
      }, 500);
    }
  }, [completedTasks, tasks.length]);

  const totalTasks = tasks.length > 0 ? tasks.length : totalTasksEver;
  const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  // ========================
  // BROWSER NOTIFICATIONS LOGIC
  // ========================
  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        const due = new Date(task.deadline);
        const diffMs = due - now;
        const daysLeft = diffMs / (1000 * 60 * 60 * 24);

        const notified = notificationRef.current[task.id];
        if (!notified) return;

        if (Notification.permission === "granted") {
          if (daysLeft < 2 && !notified.twoDays) {
            new Notification(`Task due in less than 2 days: ${task.name}`);
            notified.twoDays = true;
          } else if (daysLeft < 5 && !notified.fiveDays && !notified.twoDays) {
            new Notification(`Task due in less than 5 days: ${task.name}`);
            notified.fiveDays = true;
          } else if (daysLeft < 10.5 && !notified.tenHalfDays && !notified.twoDays && !notified.fiveDays) {
            new Notification(`Task due in less than 1.5 weeks: ${task.name}`);
            notified.tenHalfDays = true;
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);

  // ========================
  // UI
  // ========================
  return (
    <div style={{ 
      padding: 20, 
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden", 
      // ================= BACKGROUND IMAGE (COVER) =================
      backgroundImage: `url(${background})`, // uses imported PNG
      backgroundSize: "cover",              // makes image fill the screen properly
      backgroundPosition: "center",         // keeps the center of image always visible
      backgroundRepeat: "no-repeat",        // prevents tiling
    }}> 

      <Fireflies /> {/*Animated fireflies in the background*/}
      
      <div style={{ position: "relative", zIndex: 2 }}>

    {/*Title elements */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center"}}>
        <img 
          src={LeftBerry} 
          alt="Left Berry" 
          style={{ 
            width: "80px", 
            height: "auto",
            marginRight:20, 
            marginTop:20,
            animation: "berrySwingLeft 1.5s ease-in-out infinite",
            opacity: 0.8
            }} 
          />
        <img 
          src={TaskBerry} 
          alt="TaskBerry" 
          style={{ 
            width: "320px", 
            height: "auto", 
            marginTop:30
            }} 
          />
        <img 
          src={RightBerry} 
          alt="Right Berry" 
          style={{ 
            width: "80px", 
            height: "auto", 
            marginLeft:20, 
            marginTop:20,
            animation: "berrySwingRight 1.5s ease-in-out infinite",
            opacity: 0.8
          }} 
        />
      </div>
      <AddTaskForm onAdd={addTask} />
      <div style={{ marginTop: 0, position: "relative" }}>
        <h3 style={{fontFamily: "wizzta", fontSize: 38, color:"#000000d2"}}>
          Tasks Completed: {completedTasks} / {totalTasks === 0 ? 0 : totalTasks}
          <img 
            src={Star} 
            alt="Star" 
            style={{ 
              width: "25px", 
              height: "auto", 
              marginLeft:20,
              animation: "starSpin 5s linear infinite"
              }} 
            />
        </h3>
        <div style={{ height: 20, width: "100%", backgroundColor: "#f7efe9e4", borderRadius: 20, overflow: "hidden", position: "relative" }}>
          <div style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "linear-gradient(45deg, #a8e58acf 25%, #73c954d7 50%, #a8e58ac8 75%)",
            backgroundSize: "50px 50px",
            borderRadius: 10,
            transition: "width 0.5s",
            animation: "flow 1s linear infinite"
          }} />
          {sparkles.map(s => (
            <div key={s.id} style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#fff",
              left: `${s.left}%`,
              top: `${s.top}px`,
              opacity: 0.9,
              animation: "sparkle 0.8s ease-out"
            }} />
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: 20, textAlign: "center"}}>
        <h3 style={{fontFamily: "wizzta", fontSize: 37, color: "#000000e3"}}>🔥Min Weekly Focus Goal</h3>
        {(() => {
          const goal = 10;
          const percent = Math.min((weeklyData.count / goal) * 100, 100);
          const radius = 60;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (percent / 100) * circumference;
          return (
            <svg width="160" height="160">
              <circle cx="80" cy="80" r={radius} stroke="#f8f4f2ce" strokeWidth="12" fill="none" />
              <circle cx="80" cy="80" r={radius} stroke="#faf6769d" strokeWidth="12" fill="none"
                strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.5s" }} />
              <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="22" fill="#000000" style={{fontFamily: "'PixelWarden'", fontSize: 30}}>
                {weeklyData.count} / {goal}
              </text>
            </svg>
          );
        })()}
      </div>

      <div style={{ marginTop: 20, fontFamily: "wizzta", fontSize: 30}}>
        {sortedTasks.map(task => (
          !task.completed && (
          <div key={task.id} style={{
            border: "2px solid #000000",
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            backgroundColor: getPriorityColor(task.deadline),
            color: "#000000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h3 style={{ margin: 0 }}>{task.name}</h3>

              <div style={{ display: "flex", alignItems: "center", gap: 20}}>
                <small>Deadline: {task.deadline}</small>

                {new Date(task.deadline) < new Date() && (
                  <span style={{
                    color: "#ffffff",
                    fontSize: 20,
                    fontFamily: "wizzta"
                  }}>
                    DEADLINE HAS PASSED !
                  </span>
                )}
              </div>
            </div>
            <div>
              <button onClick={() => startFocus(task)} style={buttonStyle("#fff1ab")}>Focus</button>
              <button onClick={() => completeTask(task.id)} style={buttonStyle("#b1ffb1")}>Completed</button>
              <button onClick={() => deleteTask(task.id)} style={buttonStyle("#fda78b")}>Delete</button>
            </div>
          </div>
          )
        ))}
      </div>

      {activeTask && (
        //focus timer 
        <div
          style={{
            position: "fixed",
            top: timerPos.y,
            left: timerPos.x,
            backgroundColor: "#fff9bcdf",
            border: "3px solid #000000",
            borderRadius: 18,
            padding: 15,
            cursor: "grab",
            zIndex: 1000
          }}
          onMouseDown={onMouseDown}
        >
          <div style={{ position: "relative"}}> {/*relative positioning allows the stars
            to be positioned absolutely within this container, so 
            they move together when dragging the timer*/}

            <img
              src={Star}
              alt="Star"
              style={{
                position: "absolute",
                top: -28,
                left: -37,
                width: 40,
                height: "auto",
                pointerEvents: "none",
                animation: "floaty 3s ease-in-out infinite"
              }}
            />

            <img
              src={Star}
              alt="Star"
              style={{
                position: "absolute",
                top: -10,
                left: -23,
                width: 30,
                height: "auto",
                pointerEvents: "none",
                animation: "floaty 3s ease-in-out infinite",
                animationDelay: "0.3s"
              }}
            />

            {/* Book Sprite */} 
            <div 
              style={{ 
                position: "absolute",
                top: -44.5,
                right: -65,
                width: 90, 
                height: 100,
                overflow: "hidden",
                pointerEvents: "none",
                animation: "floaty 3.2s ease-in-out infinite"
              }}
            >
              <div className="bookSprite" />
            </div>

            <h3 style={{fontFamily: "wizzta", fontSize: 25, textAlign: "center"}}>FOCUSING...</h3>
            <h2 style={{fontFamily: "wizzta", fontSize: 25, textAlign: "center"}}>{minutes}:{seconds}</h2>
            <div>
              {timerRunning ? (
                <button onClick={pauseTimer} style={buttonStyle("#ffa600dc")}>Pause</button>
              ) : (
                <button onClick={() => setTimerRunning(true)} style={buttonStyle("#32cd32e8")}>Resume</button>
              )}
              <button onClick={stopTimer} style={buttonStyle("#ff4400e2")}>Stop</button>
            </div>
          </div>
        </div>
      )}

      {/*Animation effects*/} 
      <style>{`
        @keyframes flow {
          0% { background-position: 0 0; }
          100% { background-position: 50px 0; }
        }
        @keyframes sparkle {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-10px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.5); }
        }

         /*  Berry gentle swing + breathing */
        @keyframes berrySwingLeft {
          0% { transform: rotate(-6deg) scale(1); }
          50% { transform: rotate(6deg) scale(1.1); }
          100% { transform: rotate(-6deg) scale(1); }
        }

        @keyframes berrySwingRight {
          0% { transform: rotate(6deg) scale(1); }
          50% { transform: rotate(-6deg) scale(1.1); }
          100% { transform: rotate(6deg) scale(1); }
        }

        /* ===== Star full rotation ===== */
        @keyframes starSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ===== Cat sprite animation ===== */
        .catSprite {
          width: 1280px;                
          height: 720px;                
          background-image: url(${catSprite});
          background-repeat: no-repeat;
          background-size: auto 100%;
          animation: catRun 3s steps(44) infinite; /* <- frame count (there's 44 frames) */
          transform: scale(0.15); /* shrink to 15% */
          transform-origin: top left; 
        }

        @keyframes catRun {
          from { background-position: 0 0; }
          to { background-position: -56320px 0; } /* frameWidth × frameCount */
        }

        /* ===== Book sheet animation ===== */
        .bookSprite {
          width: 64px;                
          height: 64px;                
          background-image: url(${book_sheet});
          background-repeat: no-repeat;
          background-size: auto 100%;
          animation: bookRun 1.5s steps(8) infinite; /* <- frame count (there's 8 frames) */
          transform: scale(0.8); /* shrink to 80% */
          transform-origin: top left; 
        }

        @keyframes bookRun {
          from { background-position: 0 0; }
          to { background-position: -512px 0; } /* frameWidth × frameCount */
        }

        /* ===== Gentle floating animation ===== */
        @keyframes floaty {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }

        /* ===== Fireflies background ===== */

        .firefly {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, #fffbd3 30%, #fffabd 40%, transparent 80%);
          opacity: 0.8;
          filter: blur(2px);
          pointer-events: none;
          animation: floatFirefly linear infinite;
          z-index: 1;
        }

        @keyframes floatFirefly {
          from {
            transform: translateY(0px) translateX(0px);
          }
          to {
            transform: translateY(-120vh) translateX(40px);
          }
        }

      `}</style>
    </div>
  </div>
  );
}

const buttonStyle = (bg) => ({
  backgroundColor: bg,
  color: "black",
  border: "1.5px, solid",
  padding: "3px 10px",
  marginRight: 5,
  borderRadius: 7,
  cursor: "pointer",
  fontFamily: "wizzta",
  fontSize: 25
  
});

const inputStyle = {
  padding: "8px 12px",
  marginRight: 10,
  borderRadius: 8,
  border: "1.5 px solid #000000",
  fontSize: 15,
  backgroundColor: "#fffdf6",
  fontFamily: "Wizard"
};

function AddTaskForm({ onAdd }) {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !deadline) return;
    onAdd(name, deadline);
    setName("");
    setDeadline("");
  };

  return (
   <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
    }}>
      <form onSubmit={handleSubmit} style={{ textAlign: "center", marginTop: 20, marginLeft: 70}}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Task Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          style={inputStyle}
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
        
        <button type="submit" style={buttonStyle("#f3feb0")}>Add Task</button>
      </form>
        
        {/* Cat sprite */} 
        <div style={{ width: 100, height: 100 }}>
          <div className="catSprite" />
        </div>
      </div>
  );
}