// ===============================
// HOW I SET UP THIS APP THE FIRST TIME 
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

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem("streak");
    return saved ? JSON.parse(saved) : 0;
  });

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

  // Ref for storing notification state per task (to avoid triggering notifications
  //  multiple times for the same task)
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
  useEffect(() => { //lest React component run "side effects" (anything that goes 
  // outside React's rendering system like API calls, event listeners..etc.) 
  // after React updates the screen   
    localStorage.setItem("tasks", JSON.stringify(tasks)); //save tasks as string
    //updates max tasks count
    if (tasks.length > totalTasksEver) setTotalTasksEver(tasks.length); 
  }, [tasks]); //dependency array [tasks] means this effect runs only when "tasks" 
  // changes

  //saves streak whenever it changes 
  useEffect(() => {
    localStorage.setItem("streak", JSON.stringify(streak));
  }, [streak]);

  ///saves weekly focus progress whenever it changes, also ensures it resets on a new 
  // week by checking the monday date in the saved data (see weeklyData state 
  // initializer)
  useEffect(() => {
    localStorage.setItem("weeklyFocus", JSON.stringify(weeklyData));
  }, [weeklyData]);

  // ========================
  // TIMER LOGIC
  // ========================
  useEffect(() => { //runs when timerRunning or activeTask changes (start, pause, 
  // stop, or new task)
    if (!timerRunning || !activeTask) return; //stop if not running or no active task

    timerRef.current = setInterval(() => { //.current is a property where we can 
    // store mutable values that persist across renders without causing re-renders 
    // when updated (like timer interval ID)
    // setInterval(() => { ... }, 1000); is a built-in JavaScript function
    //that means "run this code every 1000 milliseconds (1 second)"
      setTimeLeft(prev => Math.max(prev - 1, 0)); //Math.max(prev-1,0) ensures
      //  timeLeft never goes below 0, prev is the previous value of timeLeft
    }, 1000);

    //cleanup function to clear the interval when timer stops or component unmounts
    //in other words, stops the repeating function created by setInterval 
    return () => clearInterval(timerRef.current);
  }, [timerRunning, activeTask]); // dependency array that ensures that the effect
// runs whenever timerRunning or activeTask changes (like when starting, pausing,
// stopping the timer, or when a new task is set as active)

  // Watch for timeLeft reaching 0 to handle timer end
  useEffect(() => {
    if (timeLeft === 0 && activeTask) { //when timer hits zero: 
      setTimerRunning(false); //stop timer 
      setStreak(s => s + 1); //increase streak by 1, s is previous value of streak
      //update weekly focus data
      
      const currentMonday = getMonday(new Date()).toISOString();
      setWeeklyData(prev => { //prev +> {..} is a function passed into the setter 
      // that receives the previous state value (prev) and returns the new state 
      // value, used when new state depends on old state to ensure we are working
      //  with the most up-to-date value

      //if we are in a new week, start fresh with count of 1, otherwise, 
      // increment the count for the current week
        if (prev.monday !== currentMonday) return { monday: currentMonday, count: 1 };
        //{...prev} is the spread operator that creates a new object with all the
        // properties of prev, then we override the count property to be prev.count
        //  + 1
        return { ...prev, count: prev.count + 1 };
      });
      triggerConfetti(); //celebratory confetti animation
      setActiveTask(null); //reset task 
    }
  }, [timeLeft, activeTask]);

  // ========================
  // TASK FUNCTIONS
  // ========================

  //creates a new task object with a unique ID, 
  // name, deadline, and completed status, takes in name and deadline as parameters 
  // from the form inputs and adds it to the tasks state array, also initializes 
  // notification flags for the new task in the notificationRef to track which 
  // notifications have been sent for this task
  function addTask(name, deadline) {
    const newTask = {
      id: Date.now(), //unique ID based on current timestamp, not perfect but good
      //  enough for this app
      name, //shorthand for name: name 
      deadline,  //shorthand for deadline: deadline
      completed: false //every new task starts as not completed
    };
    setTasks([...tasks, newTask]); //take all existing tasks, and add the new one 
    //at the end of the array, creating a new array to trigger React re-render
    notificationRef.current[newTask.id] = {  //dynamic key access to create a new 
    // entry in the notificationRef object for this task's ID (store notification flags
    //for this specific task)

    //tracks whether notifications have been sent for this task as it approaches 
    // its deadline, we use these flags to ensure we only send each 
    // notification once per task
      twoDays: false, 
      fiveDays: false, 
      tenHalfDays: false 
    };
  }

  function deleteTask(id) { //id is the ID of the task that we want to delete, 
  // passed in from the delete button on each task
    
    //filter creates a new array (React requires immutable updates) with only the 
    // items that pass a condition, in this case we keep all tasks where the task's 
    // ID is not equal to the ID of the task we want to delete, effectively removing
    // it from the list
    setTasks(tasks.filter(t => t.id !== id)); 
    delete notificationRef.current[id]; //remove the notification flags for this 
    // task since it's deleted
  }

  function startFocus(task, durationMinutes = 50) { //starts the focus timer for a 
  // given task, duration set to 50 minutes
    setActiveTask(task); // set the task we are focusing on as the activeTask, 
    // which triggers the timer useEffect
    setTimeLeft(durationMinutes * 60); //convert minutes to seconds for the timer
    setTimerRunning(true); //start the timer, which triggers the useEffect that 
    // handles the countdown since the useEffect listens to [timerRunning, activeTask],
    //so when timerRunning becomes true and activeTask is set, the timer starts 
    // counting down every second
  }

  function pauseTimer() { //pauses the focus timer without resetting the time left 
  // or active task, allowing the user to resume later
    setTimerRunning(false);
  }

  function stopTimer() {
    setTimerRunning(false);
    setTimeLeft(0); 
    setActiveTask(null);
  }

  function completeTask(id) {
    //if the task is the one we clicked, then mark it as completed, otherwise keep 
    // it the same, creates a new array of tasks with the updated completed
    //  status for the specified task. Otherwise, tasks remain unchanged.
    //complete: true is just a flag to track whether as task is done. 
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    triggerConfetti();
    createSparkles(id);

    //calculates remaining tasks by keeping only tasks that are not the completed 
    // one and not already completed, then checks how many are left, if 0, reset 
    // the whole list after a short delay 500 ms to allow confetti to show
    const remaining = tasks.filter(t => t.id !== id && !t.completed).length;
    if (remaining === 0) {
      setTimeout(() => {
        setTasks([]); //replace the tasks arry with an empty array to reset the list
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
      spread: 70, //how wide explosion is, bigger number = wider
      origin: { y: 0.6 }, //where the confetti starts, 0.6 means 60% down from 
      // the top of the screen
      colors: ["#ff69b4", "#32cd32", "#ffa500", "#ff4c4c", "#8a2be2"],
    });
  }

  // ========================
  // SPARKLES FOR PROGRESS BAR
  // ========================
  function createSparkles(taskId) {
    const newSparkles = [];
    for (let i = 0; i < 5; i++) { //creates 5 sparkles with random positions 
    // within the progress bar area, we generate random positions within the 
    // progress bar container (left: 0-100%, top: 0-20px) to create a burst of 
    // sparkles whenever a task is completed
      newSparkles.push({
        id: Date.now() + Math.random(),
        left: Math.random() * 100,
        top: Math.random() * 20,
      });
    }
    setSparkles(prev => [...prev, ...newSparkles]); //add sparkles to state to 
    // trigger rendering them on the screen
    setTimeout(() => {
      //remove the sparkles after 800ms, which is the duration of the sparkle 
      // animation
      setSparkles(prev => prev.filter(s => !newSparkles.includes(s)));
    }, 800);
  }

  // ========================
  // PRIORITY COLOR CODING BASED ON DEADLINE
  // ========================
  function getPriorityColor(deadline) {
    const today = new Date();
    const dueDate = new Date(deadline);
    const diff = (dueDate - today) / (1000 * 60 * 60 * 24); //difference in days 
    // between today and deadline in milliseconds converted to days
    if (diff <0) return "#a56363d8"; //overdue 
    if (diff < 3) return "#c68282d4"; //urgent
    if (diff <= 7) return "#d8ae61ce"; //medium priority
    return "#90b19fcc"; //safe 
  }

  // ========================
  // SORT TASKS BY DEADLINE
  // ========================
  //make a copy of the tasks array and sort it by deadline date, so that tasks
  //  with the closest deadlines appear at the top of the list, we use new Date() 
  // to convert the deadline strings into Date objects for accurate comparison
  //  when sorting by date

  //if a is earlier than b, return a negative number to sort a before b,
  //  if a is later than b, return a positive number to sort b before a, 
  // if they are the same, return 0
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - 
  new Date(b.deadline));

  // ========================
  // TIMER DISPLAY VARIABLES
  // ========================
  // .padStart(2, "0") ensures that we always show 2 digits for minutes and seconds,
  // adding a leading zero if necessary (e.g. 5 becomes "05"), and the time 
  // was converted into string first since padStart only works on strings 
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // ========================
  // DRAGGABLE TIMER LOGIC
  // ========================
  function onMouseDown(e) {
    dragRef.current.isDragging = true;
    //below two lines calculates how far inside the timer popup the user clicked, 
    // so that when we move the mouse, we can keep the same relative 
    // position of the cursor to the popup, making it feel like you 
    // are dragging the popup from where you clicked rather than snapping
    // the top-left corner to the cursor
    dragRef.current.offsetX = e.clientX - timerPos.x;
    dragRef.current.offsetY = e.clientY - timerPos.y;
  }

  function onMouseMove(e) {
    if (!dragRef.current.isDragging) return; //if not dragging, do nothing
    setTimerPos({
      // below two lines lets user drag timer while the point they grabbed stays 
      //under the cursor 
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY
    });
  }

  function onMouseUp() {
    dragRef.current.isDragging = false;
  }

  useEffect(() => {
    //window.addEventListener("mousemove", onMouseMove) and 
    // window.addEventListener("mouseup", onMouseUp) attach event listeners to the
    //  whole window to track mouse movements and when the mouse button is released,
    //  which allows the user to drag the timer popup around the screen smoothly,
    //  even if their cursor moves quickly or goes outside the bounds of the popup
    //  while dragging. The cleanup function  prevents memory leaks and unintended 
    // behavior.
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      //cleanup function to remove event listeners when component unmounts
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []); //dependency array [] means this effect runs only once on component 
  // mount and cleanup on unmount

  // ========================
  // PROGRESS BAR LOGIC
  // ========================
  
  //calculates how many tasks are completed by filtering the tasks array to only 
  // include tasks where completed is true
  const completedTasks = tasks.filter(t => t.completed).length;

  useEffect(() => {
    //if all tasks are completed, reset the list after a short delay to allow 
    // confetti to show
    if (tasks.length > 0 && completedTasks === tasks.length) {
      setTimeout(() => {
        setTasks([]);
        setTotalTasksEver(0);
      }, 500);
    }
  }, [completedTasks, tasks.length]); //effect runs when a task is completed or tasks 
  //are added/removed 

  //if tasks exist, use current task count, if tasks are cleared, use historical max
  //since after reset, setTasks([]) makes tasks.length 0, but we want to keep 
  // showing 100% progress until the user adds new tasks, so we use totalTasksEver 
  // to remember how many tasks there were before the reset, and only reset that
  //  when new tasks are added
  const totalTasks = tasks.length > 0 ? tasks.length : totalTasksEver;
  const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks)*100;

  // ========================
  // BROWSER NOTIFICATIONS LOGIC
  // ========================
  useEffect(() => { //runs when component loads or when tasks changes (due to [tasks])
    //Notification is a built-in Web API provided by the browser  
    if (!("Notification" in window)) return; //if not supported, do nothing

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.completed) return; //skip completed tasks

        const due = new Date(task.deadline);
        const diffMs = due - now; //milliseconds remaining until deadline
        const daysLeft = diffMs / (1000 * 60 * 60 * 24); //difference in days between
        //  now and deadline converted from milliseconds

        const notified = notificationRef.current[task.id]; //get notification memory
        if (!notified) return; //skip if missing (shouldn't happen)

        if (Notification.permission === "granted") {
          if (daysLeft < 2 && !notified.twoDays) {
            new Notification(`Task due in less than 2 days: ${task.name}`);
            notified.twoDays = true;
          } else if (daysLeft < 5 && !notified.fiveDays && !notified.twoDays) {
            new Notification(`Task due in less than 5 days: ${task.name}`);
            notified.fiveDays = true;
          } else if (daysLeft < 10.5 && !notified.tenHalfDays && !notified.twoDays 
            && !notified.fiveDays) {
            new Notification(`Task due in less than 1.5 weeks: ${task.name}`);
            notified.tenHalfDays = true;
          }
        }
      });
    }, 60000); //checks every minute for tasks approaching their deadlines to 
    // trigger notifications if needed

    return () => clearInterval(interval); //cleanup interval
  }, [tasks]);

  // ========================
  // UI
  // ========================
  return (
    <div style={{ 
      padding: 20, //added padding inside edges so content doesn't touch screen borders
      minHeight: "100vh", //makes container at least 100% of the viewport height (full screen)
      position: "relative", //allows children with position: absolute to be 
      // positioned relative to this container as a reference    
      overflow: "hidden", //hide anything that goes outside screen edges (so they 
      //don't create scrollbars)
      
      // ================= BACKGROUND IMAGE (COVER) =================
      backgroundImage: `url(${background})`, // uses imported PNG
      backgroundSize: "cover",         // makes image fill the screen properly
      backgroundPosition: "center",   // keeps the center of image always visible
      backgroundRepeat: "no-repeat",     // prevents tiling
    }}> 

      <Fireflies /> {/*Renders animated fireflies 
      on top of the background image but behind UI elements, depending on z-index*/}
      
        <div style={{ position: "relative", zIndex: 2 }}> 
          {/*higher z-index = on top 
          So now we have Layer 1 = background
          Layer 2 = fireflies
          Layer 3 = UI elements
          */}

    {/*Title elements */}
    {/*justifyContent control horizontal alignment, alignItems control verical */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center"}}>
        <img 
          src={LeftBerry} 
          alt="Left Berry" //shown as an alternative when the image can't be displayed
          style={{ 
            width: "80px", 
            height: "auto",
            marginRight:20, 
            marginTop: 20,
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

      {/*addTask is a function from the parent component, onAdd is a prop that passes
      the function down to the child component, AddTaskForm.   
      AddTaskForm is a custom React component that renders a form for adding new 
      tasks (defined near the bottom of the code) */}
      <AddTaskForm onAdd={addTask} />
      
      {/* Progress header UI */}
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
        
        {/* Progress bar UI */}
        <div style={{ height: 20, 
                      width: "100%", 
                      backgroundColor: "#f7efe9e4", 
                      borderRadius: 20, 
                      overflow: "hidden", 
                      position: "relative" }}>
          {/* Filled portion of progress bar*/}              
          <div style={{
            width: `${progressPercent}%`,
            height: "100%",
            //line below creates a diagonal striped pattern using a linear gradient,
            //  where the colors alternate every 25% to create the stripes
            background: "linear-gradient(45deg, #a8e58acf 25%, #73c954d7 50%, #a8e58ac8 75%)",
            backgroundSize: "50px 50px", // control size of pattern
            borderRadius: 10,
            transition: "width 0.5s", //animation over 0.5 seconds when width changes
            animation: "flow 1s linear infinite" //makes gradient moves continuously
          }} />
          
          {/* Sparkles on progress bar */}
          {sparkles.map(s => ( //take each sparkle in the sparkles array and render 
          // a small div for it with styles
            <div key={s.id} //React needs key to uniquely identify each sparkle
            style={{
              position: "absolute", //removes it from normal layout flow to
              //  position it freely within the progress bar container  
              width: 6,
              height: 6,
              borderRadius: "50%", //makes a tiny circle, along with width and 
              // height lines above
              backgroundColor: "#fff",
              left: `${s.left}%`, //horizontal position (% of bar width)
              top: `${s.top}px`, //vertical position (px from top of bar)
              opacity: 0.9,
              animation: "sparkle 1s ease-out"
            }} />
          ))}
        </div> {/*closes progress bar container*/} 
      </div> {/*closes progress header container*/}
      
      {/* Weekly focus goal circular progress indicator UI */}
      <div style={{ marginTop: 20, textAlign: "center"}}>
        <h3 style={{
          fontFamily: "wizzta", 
          fontSize: 37, 
          color: "#000000e3"}}>🔥Min Weekly Focus Goal</h3>
        
        {/* This part: 
        {(() => {
          ...
          return ( ... )
        })()} 
          is an IIFE (Immediately Invoked Function Expression) that means: 
          "Run this JavaScript code right here and return JSX to render the progress 
          circle based on the weekly focus data, and do it immediately 
          when rendering this part of the UI"
        */}
        {(() => {
          const goal = 10; //weekly target is 10 focus sessions minimum 
          //progress ratio as a percentage, capped at 100% if they exceed the goal,
          //  so we don't have the progress circle overflow 
          const percent = Math.min((weeklyData.count / goal) * 100, 100);
          const radius = 60; 
          const circumference = 2 * Math.PI * radius;
          // determines which part of the circle to fill based on progress
          const offset = circumference - (percent / 100) * circumference;
          return (
            <svg width="160" height="160"> {/*drawing canvas*/}
              
              {/*Background circle */}
              <circle 
                //cx and cy set the center position of the circle, (0,0) being
                //top left corner, x increases to the right and y increases 
                //downwards
                cx="80" 
                cy="70" 
                r={radius} 
                stroke="#f8f4f2ce" 
                strokeWidth="12" 
                fill="none" 
              />

              {/*Filled circle portion*/}
              <circle 
                cx="80" 
                cy="70" 
                r={radius} 
                stroke="#faf6769d" 
                strokeWidth="12" 
                fill="none"
                strokeDasharray={circumference} //drawable length of this circle 
                strokeDashoffset={offset} //fill part of the circle based on progress
                //for smooth animation of the ring when progress changes 
                //stroke-dashoffset is a built-in SVG/CSS property that controls 
                style={{ transition: "stroke-dashoffset 0.5s" }} />
              
              <text //like a <p> or <span> in html but for SVGs, draws text inside 
              //SVG canvas 
                x="50%" 
                y="45%" 
                textAnchor="middle" //centers the text about the x axis
                dy=".3em" //nudges text down slightly, em = relative to font size,
                //.3em = small downward adjustment, so fine adjustment to visually
                //center the text within the circle 
                fontSize="22" 
                fill="#000000" 
                style={{fontFamily: "'PixelWarden'", fontSize: 30}}>
                {/* Displays how many sessions completed compared to weekly goal*/}
                {weeklyData.count} / {goal} 
              </text>
            </svg> //closes SVG canvas
          );
        })()}
      </div>

      {/* Task list UI, maps over the sortedTasks array to render each task,
      only renders tasks that are not completed (task.completed is false) */}
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
            //Below lines create a flexbox layout for the task item, with space 
            // between the task details on the left and the action buttons on the 
            // right, and vertically center them within the task item container
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            
            {/* Left side of task item with name and deadline */}
            <div>
              <h3 style={{ margin: 0 }}>{task.name}</h3>

              <div style={{ display: "flex", alignItems: "center", gap: 20}}>
                <small>Deadline: {task.deadline}</small>

                {new Date(task.deadline) < new Date() && (
                  <span style={{ //used span instead of div to put DEADLINE HAS 
                  // PASSED on the same line as the deadline and style it separately
                  //also span is good for adding a small piece of extra info 
                    color: "#ffffff",
                    fontSize: 20,
                    fontFamily: "wizzta"
                  }}>
                    DEADLINE HAS PASSED !
                  </span>
                )}
              </div>
            </div> {/*closes left side of task item*/}

             {/* Right side of task item with action buttons */}
            <div>
              <button onClick={() => startFocus(task)} 
                      style={buttonStyle("#fff1ab")}>Focus</button>
              <button onClick={() => completeTask(task.id)} 
                      style={buttonStyle("#b1ffb1")}>Completed</button>
              <button onClick={() => deleteTask(task.id)} 
                      style={buttonStyle("#fda78b")}>Delete</button>
            </div> {/*closes right side of task item*/}
          </div> //closes task item container
          )
        ))}
      </div>  {/*closes task list container*/}

    {/* Focus timer popup UI, only rendered when there is an active task 
    (activeTask is not null) */}
      {activeTask && (
        //focus timer UI
        <div
          style={{
            position: "fixed", //position relative to the screen (viewport) so 
            //it stays in the same place even when scrolling
            //timerPos updates when we drag, React re-renders -> timer moves  
            top: timerPos.y,
            left: timerPos.x,
            backgroundColor: "#fff9bcdf",
            border: "3px solid #000000",
            borderRadius: 18,
            padding: 15,
            cursor: "grab",
            zIndex: 1000 //force timer to stay on top of everything else on the page
          }}
          onMouseDown={onMouseDown} //start dragging when timer is clicked and held
        >
          {/* Inner container for floating star and book sprites */}
          <div style={{ position: "relative"}}> {/*relative positioning allows the 
            stars to be positioned absolutely within this container, so 
            they move together when dragging the timer*/}

            <img
              src={Star}
              alt="Star"
              style={{
                position: "absolute", //stars positioned relative to the timer container
                top: -28, //how much the star is above the top edge of the timer 
                // container
                left: -37, //how much the star is to the left from the left edge 
                // of the timer container
                width: 40,
                height: "auto",
                pointerEvents: "none", //allows clicks to pass through the star so 
                // it doesn't interfere with dragging the timer (block mouse clicks)
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
                overflow: "hidden", //hides the parts of the book sprite that go 
                // outside this container, so we only see the animated book and not
                //  the whole sprite sheet
                pointerEvents: "none",
                animation: "floaty 3.2s ease-in-out infinite"
              }}
            >
              <div className="bookSprite" /> {/* This div uses the .bookSprite 
              class defined in the style tag below to create an animated book 
              sprite */}
            </div> {/* closes book sprite container */}

            <h3 style={{
              fontFamily: "wizzta", 
              fontSize: 25, 
              textAlign: "center"}}>FOCUSING...</h3>
            
            <h2 style={{
              fontFamily: "wizzta", 
              fontSize: 25, 
              textAlign: "center"}}>{minutes}:{seconds}</h2>
            
            {/* Timer control buttons */}
            <div>
              {timerRunning ? (
                <button onClick={pauseTimer} 
                        style={buttonStyle("#ffa600dc")}>Pause</button>
              ) : (
                <button onClick={() => setTimerRunning(true)} 
                        style={buttonStyle("#32cd32e8")}>Resume</button>
              )}
              <button onClick={stopTimer} 
                      style={buttonStyle("#ff4400e2")}>Stop</button>
            </div> {/*closes button container*/}
          </div> {/*closes inner container for floating star and book sprites*/}
        </div> //closes focus timer popup
      )}

      {/*Animation effects*/} 
      <style>{`
        @keyframes flow {
          /* Slides background to the right repeatedly */
          0% { background-position: 0 0; }
          100% { background-position: 50px 0; }
        }
        @keyframes sparkle {
        /* Sparkle effect that makes the sparkles fade out and move upwards */
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-10px) scale(1.3); } 
          100% { opacity: 0; transform: translateY(-20px) scale(0.5); }
        }

         /*  Berry gentle swing + breathing */
        @keyframes berrySwingLeft {
          0% { transform: rotate(-6deg) scale(1); } /* start slightly rotated left */
          50% { transform: rotate(6deg) scale(1.1); } /* rotates to the right and 
          slightly bigger */
          100% { transform: rotate(-6deg) scale(1); } /* back to start */
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
          background-repeat: no-repeat; /* prevents tiling of the sprite sheet */
          background-size: auto 100%; /* scales the background image to fit the 
          height of the container, width is auto to maintain aspect ratio */
          animation: catRun 3s steps(44) infinite; /* <- frame count (there's 44 
          frames) */
          transform: scale(0.15); /* shrink to 15% since sprite sheet too large */
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
          animation: bookRun 1.5s steps(8) infinite; /* <- frame count (there's 8 
          frames) */
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
          border-radius: 50%; /*makes it a circle*/
          background: radial-gradient(circle, #fff 0%, #fffbd3 30%, 
          #fffabd 40%, transparent 80%);
          opacity: 0.8;
          filter: blur(2px); //enhances glow effect
          pointer-events: none; /*to block mouse clicking */
          animation: floatFirefly linear infinite;
          z-index: 1; /*above background but behind all other UI components*/ 
        }

        @keyframes floatFirefly {
          from {
            transform: translateY(0px) translateX(0px);
          }
          to {
          /*fireflies each move upward and slightly to the right, vh means viewport
          height, and 120vh means it travels beyond the top of the screen*/
            transform: translateY(-120vh) translateX(40px); 
          }
        }

      `}</style>
    </div> {/* closes UI layer (all UI content)*/}
  </div> // closes outer container (entire app layout wrapper)
  );
}

// create a function that takes a background color and returns a style object
const buttonStyle = (bg) => ({
  backgroundColor: bg,
  color: "black",
  border: "1.5px, solid",
  padding: "3px 10px",
  marginRight: 5,
  borderRadius: 7,
  cursor: "pointer", //means "clickable"
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

function AddTaskForm({ onAdd }) { //reusable component that takes function onAdd 
  //from its parent (App), it collects input and sends it upward 
  const [name, setName] = useState(""); //task name input 
  const [deadline, setDeadline] = useState(""); //date input 

  const handleSubmit = (e) => {
    e.preventDefault(); //stops page from refreshing 
    if (!name || !deadline) return; //prevents empty tasks from being added 
    onAdd(name, deadline); //sends data back to parent and App creates the task
    //below two lines clears the form after submission 
    setName(""); 
    setDeadline("");
  };

  return (
    //layout wrapper
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
    }}>
      <form onSubmit={handleSubmit} //pressing enter or clicking button triggers 
      // handleSubmit
        style={{ 
          textAlign: "center", 
          marginTop: 20, 
          marginLeft: 70}}>
        
        <input
          style={inputStyle}
          type="text"
          placeholder="Task Name"
          value={name} //React controls displayed text 
          onChange={e => setName(e.target.value)} //event handler (run this function 
          // whenever input changes) that updates state on every keystroke
          //e = event object (React gives this automatically), React stores latest 
          //input value (keystroke) in name, triggers re-renders then updates 
          // value={name}
        />

        <input
          style={inputStyle}
          type="date" //browser gives a calendar UI 
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