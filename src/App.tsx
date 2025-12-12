import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import {
  Camera,
  Clock,
  UserCheck,
  UserX,
  Users,
  Trash2,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Lock,
  Edit,
  UserMinus,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  FileSpreadsheet,
  Save,
  FileQuestion,
  CheckCircle,
  XCircle,
  User,
  Dices,
  LayoutGrid,
  Download,
  Share,
  Sparkles
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where // 🟢 1. เพิ่ม where เข้ามาเพื่อกรองข้อมูล
} from "firebase/firestore";


const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyeqlDsLOcUZN6GLJhntUjr6peBIf5ThNBbCKZVC968jtq9AEJiWDD1s6hQPZc3ktSnEw/exec";

// --- Constants ---
const COLLEGE_LAT = 14.105260105890562;
const COLLEGE_LNG = 100.32044313706368;
const MAX_DISTANCE_METERS = 50;

const TEACHER_SECRET_CODE = "3399";

// 🔊 Sound Effect File
const SUCCESS_SOUND_URL = "https://www.soundjay.com/buttons/sounds/button-3.mp3";
const ROLL_SOUND_URL = "https://www.soundjay.com/misc/sounds/magic-chime-01.mp3"; 

const firebaseConfig = {
  apiKey: "AIzaSyD2mam9j5GCa90BF5rLnrRelJi7tJ8lTrE",
  authDomain: "attendance-check-40d47.firebaseapp.com",
  projectId: "attendance-check-40d47",
  storageBucket: "attendance-check-40d47.firebasestorage.app",
  messagingSenderId: "113734265692",
  appId: "1:113734265692:web:fbeb6004400798616def99",
  measurementId: "G-5VYSED3XLJ",
};

let app: any, auth: any, db: any;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Config Error:", e);
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371;
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d * 1000;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const getYearMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function PhotoAttendanceSystem() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [page, setPage] = useState("login");

  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const [manageMode, setManageMode] = useState(false);
  const [viewingHistoryStudent, setViewingHistoryStudent] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [studentFullHistory, setStudentFullHistory] = useState<any[]>([]);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ fullName: "", studentNumber: "", level: "", room: "", department: "" });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false); 

  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomResult, setRandomResult] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false); 
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSize, setGroupSize] = useState<number>(5);
  const [groups, setGroups] = useState<any[][]>([]);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null); 
  const [isIos, setIsIos] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>(
    getYearMonth(new Date())
  );

  const [users, setUsers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lateTime, setLateTime] = useState("07:50");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "student",
    studentNumber: "",
    level: "", 
    room: "",  
    grade: "", 
    department: "คอมพิวเตอร์",
    secretCode: "",
  });

  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);

  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceToCollege, setDistanceToCollege] = useState<number | null>(
    null
  );
  const [gpsError, setGpsError] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(false); // 
  const [isLoadingStudentHistory, setIsLoadingStudentHistory] = useState(true); // 
  // 🟢 PWA: ตรวจจับอุปกรณ์
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
      });
    } else if (isIos) {
      setShowIosInstallModal(true);
    }
  };

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch((error) =>
      console.error("Auth Error:", error)
    );
    const unsubscribe = onAuthStateChanged(auth, (user) =>
      setFirebaseUser(user)
    );
    return () => unsubscribe();
  }, []);

// 🟢 2. แก้ไขส่วนดึงข้อมูลให้เร็วขึ้น - โหลดเฉพาะข้อมูลของตัวเอง
useEffect(() => {
  if (!firebaseUser || !db) return;
  
  console.log("🔄 เริ่มโหลดข้อมูล...");
  
  // 1. ดึงข้อมูล Users
  const usersQuery = query(collection(db, "users"));
  const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
    const loadedUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("✅ โหลด Users เสร็จ:", loadedUsers.length, "คน");
    setUsers(loadedUsers);
    setIsDataLoaded(true); 
  });

  // 2. ดึงข้อมูล Attendance - โหลดตามบทบาท
  let attendanceQuery;
  
  // 🟢 ถ้ามี currentUser แล้ว ให้เช็คว่าเป็นนักเรียนหรือไม่
  if (currentUser && currentUser.role === "student") {
    // นักเรียน: โหลดเฉพาะของตัวเอง
    attendanceQuery = query(
      collection(db, "attendance"),
      where("username", "==", currentUser.username)
    );
    console.log("👨‍🎓 นักเรียน: โหลดเฉพาะประวัติของตัวเอง");
  } else {
    // อาจารย์: โหลดข้อมูลวันนี้
    const todayStr = new Date().toISOString().split('T')[0]; 
    attendanceQuery = query(
      collection(db, "attendance"),
      where("checkInTime", ">=", todayStr), 
      where("checkInTime", "<=", todayStr + "T23:59:59")    
    );
    console.log("👨‍🏫 อาจารย์: โหลดข้อมูลวันนี้");
  }

  const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
    const loadedRecords = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checkInTime: data.checkInTime
          ? new Date(data.checkInTime)
          : new Date(),
      };
    });
    loadedRecords.sort(
      (a, b) => b.checkInTime.getTime() - a.checkInTime.getTime()
    );
    
    console.log("✅ โหลด Attendance เสร็จ:", loadedRecords.length, "รายการ");
    setAttendanceRecords(loadedRecords);
    setIsLoadingStudentHistory(false); // 🟢 โหลดเสร็จแล้ว
  }, (error) => {
    console.error("❌ Firebase Error:", error);
    setIsLoadingStudentHistory(false); // 🟢 ถ้า error ก็หยุด loading
  });

  // 3. ดึงข้อมูล Leaves (ระบบลา)
  const leavesQuery = query(collection(db, "leaves"));
  const unsubLeaves = onSnapshot(leavesQuery, (snapshot) => {
    const loadedLeaves = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date()
    }));
    loadedLeaves.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    console.log("✅ โหลด Leaves เสร็จ:", loadedLeaves.length, "รายการ");
    setLeaves(loadedLeaves);
  });

  return () => {
    unsubUsers();
    unsubAttendance();
    unsubLeaves();
  };
}, [firebaseUser, currentUser]); // 🟢 เพิ่ม currentUser เป็น dependency
useEffect(() => {
  if (!firebaseUser || !db || !currentUser) return;
  if (currentUser.role !== "teacher") return;
  
  const targetDate = filterDate;
  
  // 🟢 เริ่ม Loading
  setIsLoadingTeacherData(true);
  console.log("🔄 อาจารย์ดูข้อมูลวันที่:", targetDate);
  
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("checkInTime", ">=", targetDate),
    where("checkInTime", "<=", targetDate + "T23:59:59")
  );

  const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
    const loadedRecords = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : new Date(),
      };
    });
    loadedRecords.sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime());
    setAttendanceRecords(loadedRecords);
    
    // 🟢 โหลดเสร็จแล้ว
    setIsLoadingTeacherData(false);
  });

  return () => unsubAttendance();
}, [firebaseUser, currentUser, filterDate]);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);
  

  // 🎲 Function: สุ่มชื่อนักเรียนพร้อม Animation
  const handleRandomStudent = () => {
    const studentsInGrade = users.filter(u => u.role === "student" && u.grade === selectedGrade);
    
    if (studentsInGrade.length === 0) {
      setRandomResult("ไม่มีนักเรียนในห้องนี้");
      return;
    }

    setIsRolling(true);
    setRandomResult(null);

    let count = 0;
    const maxCount = 20; // จำนวนครั้งที่จะสลับชื่อ
    const interval = setInterval(() => {
      // สุ่มชื่อโชว์รัวๆ
      const randomIndex = Math.floor(Math.random() * studentsInGrade.length);
      setRandomResult(studentsInGrade[randomIndex].fullName);
      
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        setIsRolling(false);
        // เล่นเสียงตอนจบ
        const audio = new Audio(ROLL_SOUND_URL);
        audio.play().catch(() => {}); // กัน error กรณี browser บล็อกเสียง
      }
    }, 100); // ความเร็วในการสลับ (ms)
  };

  const handleGenerateGroups = () => {
    const studentsInGrade = users.filter(u => u.role === "student" && u.grade === selectedGrade);
    if (studentsInGrade.length === 0) return;

    const shuffled = [...studentsInGrade].sort(() => 0.5 - Math.random());
    
    const newGroups = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
        newGroups.push(shuffled.slice(i, i + groupSize));
    }
    setGroups(newGroups);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isLate = (time: Date) => {
    const [hours, minutes] = lateTime.split(":");
    const lateThreshold = new Date();
    lateThreshold.setHours(parseInt(hours), parseInt(minutes), 0);
    return time > lateThreshold;
  };

  const toggleExpandRecord = (id: string) => {
    if (expandedRecordId === id) {
      setExpandedRecordId(null);
    } else {
      setExpandedRecordId(id);
    }
  };

  // --- เปิด Modal แก้ไขข้อมูล (แยก Grade เป็น Level และ Room) ---
  const openEditModal = (student: any) => {
    setEditingStudent(student);
    
    let currentLevel = "";
    let currentRoom = ""; // ถ้าเป็นค่าว่าง "" แปลว่า "ห้องเดียว"

    if (student.grade) {
        const parts = student.grade.split('/');
        if (parts.length === 2) {
            currentLevel = parts[0];
            currentRoom = parts[1]; 
        } else {
            currentLevel = student.grade; 
            currentRoom = ""; 
        }
    }

    setEditForm({
      fullName: student.fullName,
      studentNumber: student.studentNumber,
      level: currentLevel,
      room: currentRoom,
      department: student.department
    });
  };

  // --- บันทึกข้อมูลแก้ไข (Logic รวม Grade) ---
  const saveStudentInfo = async () => {
    if (!db || !editingStudent) return;
    if (!editForm.fullName || !editForm.studentNumber || !editForm.level) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    // 🟢 Logic รวมร่าง: ถ้าเลือกห้อง (1,2) ให้เติม /x ถ้าเลือก "ห้องเดียว" ("") ให้ใช้ชื่อชั้นเพียวๆ
    const newGrade = (editForm.room && editForm.room !== "") 
        ? `${editForm.level}/${editForm.room}` 
        : editForm.level;

    if (confirm(`ยืนยันการแก้ไขข้อมูลของ ${editingStudent.fullName} หรือไม่?`)) {
      try {
        const userRef = doc(db, "users", editingStudent.id);
        await updateDoc(userRef, {
          fullName: editForm.fullName,
          studentNumber: editForm.studentNumber,
          grade: newGrade,
          department: editForm.department
        });
        alert("บันทึกข้อมูลเรียบร้อยแล้ว ✅ ระบบจะรีโหลดเพื่ออัปเดตข้อมูล...");
        setEditingStudent(null); 
        window.location.reload(); // รีโหลดเพื่อให้เห็นข้อมูลห้องใหม่ทันที
      } catch (err: any) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      }
    }
  };

  // --- ฟังก์ชันขอลาหยุด (เพิ่ม isSubmitting) ---
  const requestLeave = async () => {
    if (!db || !leaveReason) return alert("กรุณาระบุสาเหตุการลา");
    if (isSubmittingLeave) return; // 🟢 กันเบิ้ล
    
    setIsSubmittingLeave(true);

    try {
      await addDoc(collection(db, "leaves"), {
        studentName: currentUser.fullName,
        username: currentUser.username,
        studentNumber: currentUser.studentNumber,
        grade: currentUser.grade,
        department: currentUser.department,
        reason: leaveReason,
        status: "pending", // รออนุมัติ
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0] // ลาของวันนี้
      });
      alert("ส่งคำขอลาเรียบร้อยแล้ว! รออาจารย์อนุมัติ");
      setShowLeaveModal(false);
      setLeaveReason("");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // --- 🟢 อนุมัติลา + Auto Sync ไป Google Sheet ---
  const handleLeaveAction = async (leave: any, isApproved: boolean) => {
    if (!db) return;
    if(!confirm(`ต้องการ ${isApproved ? "อนุมัติ" : "ปฏิเสธ"} การลาของ ${leave.studentName} ใช่หรือไม่?`)) return;

    try {
      await updateDoc(doc(db, "leaves", leave.id), {
        status: isApproved ? "approved" : "rejected"
      });

      if (isApproved) {
        const todayStr = leave.date; 
        const hasCheckedIn = attendanceRecords.some(r => {
             const rDate = r.checkInTime instanceof Date ? r.checkInTime.toISOString().split('T')[0] : new Date(r.checkInTime).toISOString().split('T')[0];
             return r.username === leave.username && rDate === todayStr;
        });

        if (!hasCheckedIn) {
            const checkInTime = new Date().toISOString();
            // 1. บันทึกลง Firebase
            await addDoc(collection(db, "attendance"), {
                studentName: leave.studentName,
                username: leave.username,
                studentNumber: leave.studentNumber,
                grade: leave.grade,
                department: leave.department,
                photo: "", // 🟢 ไม่ใช้รูป URL
                checkInTime: checkInTime,
                status: "leave", 
                location: { lat: 0, lng: 0 },
                distance: 0,
                isOffCampus: false,
                leaveReason: leave.reason // 🟢 บันทึกเหตุผลลงไปด้วย
            });

            // 2. 🟢 Auto Sync to Google Sheet ทันที
            const payload = {
                name: leave.studentName,
                studentNumber: leave.studentNumber,
                studentId: leave.studentNumber, // ถ้าไม่มีรหัสนักศึกษาใน leave object ให้ใช้ studentNumber แทน
                status: "leave",
                checkInTime: formatTime(new Date(checkInTime)),
                grade: leave.grade || "ไม่ระบุชั้น"
            };
            
            // ยิงไป Google Apps Script (แบบไม่ต้องรอผลตอบกลับก็ได้ เพื่อความเร็ว)
            fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
            }).catch(err => console.error("Auto sync leave failed", err));
        }
      }
      alert("ดำเนินการเรียบร้อยแล้ว ✅ (ข้อมูลถูกส่งไป Google Sheet แล้ว)");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleLogin = () => {
  const hardcodedAdmin = {
    username: "admin",
    password: "admin123",
    role: "teacher",
    fullName: "อาจารย์ Admin",
    department: "คอมพิวเตอร์",
  };
  const allUsers = [...users, hardcodedAdmin];
  const user = allUsers.find(
    (u) =>
      u.username === loginForm.username && u.password === loginForm.password
  );
  if (user) {
    setCurrentUser(user);
    setPage(user.role === "teacher" ? "teacher" : "student");
    setLoginForm({ username: "", password: "" });
    // 🟢 เข้าได้เลย ไม่ต้องรอโหลดข้อมูล
  } else {
    alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
};
  const handleRegister = async () => {
    if (!db) return;
    if (
      !registerForm.username ||
      !registerForm.password ||
      !registerForm.fullName
    )
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    if (registerForm.password !== registerForm.confirmPassword)
      return alert("รหัสผ่านไม่ตรงกัน");
    if (users.find((u) => u.username === registerForm.username))
      return alert("ชื่อผู้ใช้นี้มีอยู่แล้ว");

    if (
      registerForm.role === "teacher" &&
      registerForm.secretCode !== TEACHER_SECRET_CODE
    ) {
      return alert(
        "❌ รหัสยืนยันสำหรับอาจารย์ไม่ถูกต้อง! กรุณาติดต่อฝ่ายทะเบียนเพื่อขอรหัส"
      );
    }

    // ตรวจสอบ Level (Room ไม่ต้องบังคับ)
    if (
      registerForm.role === "student" &&
      (!registerForm.studentNumber || !registerForm.level)
    )
      return alert("กรุณาเลือก ระดับชั้น ให้ครบถ้วน");

    const newUser: any = {
      username: registerForm.username,
      password: registerForm.password,
      fullName: registerForm.fullName,
      role: registerForm.role,
      department: registerForm.department,
      createdAt: new Date().toISOString(),
    };

    if (registerForm.role === "student") {
      newUser.studentNumber = registerForm.studentNumber;
      // 🟢 Logic รวมร่าง
      if (registerForm.room && registerForm.room !== "") {
        newUser.grade = `${registerForm.level}/${registerForm.room}`;
      } else {
        newUser.grade = registerForm.level;
      }
    }

    try {
      await addDoc(collection(db, "users"), newUser);
      alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
      setPage("login");
      setRegisterForm({
        username: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        role: "student",
        studentNumber: "",
        level: "", room: "", // Reset
        grade: "",
        department: "คอมพิวเตอร์",
        secretCode: "",
      });
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("login");
    setCapturedPhoto(null);
    setManageMode(false);
    setViewingHistoryStudent(null);
    setEditingStudent(null); 
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const updateLocation = () => {
    setGpsError("");
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation({ lat, lng });
          const dist = getDistanceFromLatLonInMeters(
            lat,
            lng,
            COLLEGE_LAT,
            COLLEGE_LNG
          );
          setDistanceToCollege(dist);
          setIsLocating(false);
        },
        (err) => {
          console.error(err);
          setGpsError("ไม่สามารถระบุตำแหน่งได้");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGpsError("เบราว์เซอร์ไม่รองรับ GPS");
      setIsLocating(false);
    }
  };

  const startCamera = async () => {
    updateLocation();
    try {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      alert("ไม่สามารถเข้าถึงกล้องได้");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg", 0.6);
        setCapturedPhoto(photoData);
        if (stream) stream.getTracks().forEach((track) => track.stop());
        setShowCamera(false);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };


const submitAttendance = async () => {
  if (!db) return;
  if (!capturedPhoto) {
    alert("กรุณาถ่ายรูปก่อนเช็คชื่อ");
    return;
  }

  const isOffCampus = distanceToCollege
    ? distanceToCollege > MAX_DISTANCE_METERS
    : true;

  if (isOffCampus) {
    alert("❌ ไม่สามารถเช็คชื่อได้!\n\nกรุณากดอนุญาตการเปิดตำแหน่ง");
    return;
  }

  const now = new Date();
  const [h, m] = lateTime.split(":");
  const isLate =
    now.getHours() > parseInt(h) ||
    (now.getHours() === parseInt(h) && now.getMinutes() > parseInt(m));

  // --- เช็คว่าวันนี้เคยเช็คชื่อไปหรือยัง (1 วัน 1 ครั้ง) ---
  const todayStr = now.toISOString().split('T')[0]; 
  const hasCheckedInToday = attendanceRecords.some((record) => {
    if (record.username !== currentUser.username) return false;
    const recordDate = record.checkInTime instanceof Date 
      ? record.checkInTime.toISOString().split('T')[0]
      : new Date(record.checkInTime).toISOString().split('T')[0];
    
    return recordDate === todayStr;
  });

  if (hasCheckedInToday) {
    alert("❌ วันนี้คุณเช็คชื่อไปแล้วครับ! (สามารถเช็คได้วันละ 1 ครั้ง)");
    return;
  }

  const newRecord = {
    studentName: currentUser.fullName,
    username: currentUser.username,
    studentNumber: currentUser.studentNumber,
    grade: currentUser.grade,
    department: currentUser.department,
    photo: capturedPhoto,
    checkInTime: now.toISOString(),
    status: isLate ? "late" : "present",
    location: currentLocation,
    distance: distanceToCollege,
    isOffCampus: isOffCampus,
  };

  try {
    // 1. บันทึกลง Firebase
    await addDoc(collection(db, "attendance"), newRecord);
    console.log("✅ Firebase: บันทึกสำเร็จ");

    // 2. ส่งข้อมูลไป Google Sheets
    const payload = {
      name: currentUser.fullName,
      studentNumber: currentUser.studentNumber,
      studentId: currentUser.studentNumber,
      status: isLate ? "late" : "present",
      checkInTime: formatTime(now),
      grade: currentUser.grade || "ไม่ระบุชั้น"
    };

    console.log("📤 กำลังส่งข้อมูล...", payload);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    // 🟢 เช็คว่า Sync สำเร็จไหม
    if (!response.ok) {
      console.error("❌ Sync failed:", response.status);
      alert("⚠️ เช็คชื่อสำเร็จแล้ว!\n\nหากการส่งล้มเหลว\nกรุณาแจ้งอาจารย์ให้กดซิงค์ข้อมูลใหม่");
    } else {
      const result = await response.json();
      console.log("✅ บันทึกสำเร็จ", result);
    }

    // 🔊 Sound Effect
    const audio = new Audio(SUCCESS_SOUND_URL);
    audio.play().catch(() => {}); // Ignore if browser blocks audio

    setCapturedPhoto(null);
    alert("✅ เช็คชื่อสำเร็จ! บันทึกลงฐานข้อมูลเรียบร้อยเเล้ว");
    
  } catch (err: any) {
    console.error("❌ Error:", err);
    alert("⚠️ เกิดข้อผิดพลาด: " + err.message + "\n\nกรุณาลองใหม่อีกครั้ง");
  }
};

  
  const handleSyncData = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todaysRecords = attendanceRecords.filter(r => {
      if (!r.checkInTime) return false;
      const recordDate = new Date(r.checkInTime).toISOString().split('T')[0];
      return recordDate === todayStr;
    });

    if (todaysRecords.length === 0) {
      alert("ไม่พบข้อมูลการเช็คชื่อของวันนี้ในระบบ");
      return;
    }

    if (!confirm(`พบข้อมูล ${todaysRecords.length} รายการ จะทำการซิงค์รวดเดียว... ยืนยัน?`)) return;

    const batchData = todaysRecords.map(record => ({
      name: record.studentName,
      studentNumber: record.studentNumber,
      studentId: record.studentNumber,
      status: record.status,
      checkInTime: formatTime(new Date(record.checkInTime)),
      grade: record.grade || "ไม่ระบุชั้น"
    }));

    const payload = {
      mode: "batch_sync",
      data: batchData
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });
      
      alert(`✅ ส่งข้อมูล ${batchData.length} รายการเรียบร้อยแล้ว!`);
    } catch (e) {
      console.error("Sync error", e);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    }
  };

  const deleteRecord = async (id: string) => {
    if (!db) return;
    if (window.confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "attendance", id));
      } catch (err) {
        alert("ลบข้อมูลไม่สำเร็จ");
      }
    }
  };

  const deleteStudentAccount = async (id: string) => {
    if (!db) return;
    if (
      window.confirm(
        "⚠️ คำเตือน: การลบนี้จะทำให้บัญชีนักเรียนหายไปถาวร ต้องสมัครใหม่\n\nยืนยันการลบหรือไม่?"
      )
    ) {
      try {
        await deleteDoc(doc(db, "users", id));
        alert("ลบบัญชีนักเรียนเรียบร้อยแล้ว");
      } catch (err) {
        alert("ลบไม่สำเร็จ");
      }
    }
  };

  const changeStudentPassword = async (student: any) => {
    if (!db || !student) return;
    const newPass = prompt("กรุณากรอกรหัสผ่านใหม่สำหรับ " + student.fullName);
    if (newPass) {
      try {
        const userRef = doc(db, "users", student.id);
        await updateDoc(userRef, { password: newPass });
        alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว! \nรหัสใหม่คือ: " + newPass);
      } catch (err) {
        alert("เปลี่ยนรหัสไม่สำเร็จ");
      }
    }
  };

  // --- Export CSV Function (Filtered by Month) ---
  const exportToCSV = (student: any) => {
    const studentRecords = attendanceRecords
      .filter((r) => {
        const recordMonth = getYearMonth(new Date(r.checkInTime));
        return (
          r.username === student.username && recordMonth === historyFilterMonth
        );
      })
      .sort(
        (a, b) =>
          new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      );

    const headers = ["วันที่", "เวลา", "สถานะ", "สถานที่", "ระยะห่าง"];

    const rows = studentRecords.map((record) => [
      formatDate(record.checkInTime),
      formatTime(record.checkInTime),
      record.status === "late" ? "มาสาย" : (record.status === "leave" ? "ลา" : "มาทันเวลา"),
      record.isOffCampus ? "นอกพื้นที่" : "ในวิทยาลัย",
      Math.round(record.distance || 0) + " เมตร",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ประวัติการเช็คชื่อ_${student.fullName}_${historyFilterMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI Components ---

  if (page === "login") {
    // (Login Code ...)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-6 relative group">
              <img
                src="/nicnon.png"
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-lg transform transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <h2 className="text-xl font-bold text-gray-700">
              เข้าสู่ระบบ (วิทยาลัยเทคนิคนนทบุรี)
            </h2>
            {/* PWA Install Button */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="mt-2 text-xs text-indigo-500 flex items-center justify-center gap-1 hover:underline"
              >
                <Download size={12} /> ติดตั้งแอปบนมือถือ
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="password"
              />
            </div>
            <button
  onClick={handleLogin}
  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md"
>
  เข้าสู่ระบบ
</button>
            <button
              onClick={() => setPage("register")}
              className="w-full bg-white text-indigo-600 border border-indigo-600 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              สมัครสมาชิก
            </button>
            <div className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center gap-2">
              {firebaseUser ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  เชื่อมต่อฐานข้อมูลแล้ว
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  กำลังเชื่อมต่อ...
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === "register") {
    // (Register Code ...)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        {/* ... (Register UI - ละไว้ในฐานที่เข้าใจ หรือจะให้แปะเต็มๆ ก็บอกได้ครับ) ... */}
        {/* พี่ขอแปะ UI Register เต็มๆ ให้เลยดีกว่าครับ จะได้ไม่หลุด */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/nicnon.png"
              alt="Logo"
              className="w-16 h-16 mx-auto mb-4 object-contain"
            />
            <h1 className="text-3xl font-bold text-gray-800">สมัครสมาชิก</h1>
            <p className="text-gray-600 mt-2">สร้างบัญชีใหม่</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภท
              </label>
              <select
                value={registerForm.role}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, role: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="student">นักเรียน</option>
                <option value="teacher">อาจารย์</option>
              </select>
            </div>
            {registerForm.role === "teacher" && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 animate-pulse">
                <label className="block text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <Lock size={16} /> รหัสยืนยันอาจารย์
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="กรุณากรอกรหัสยืนยัน"
                  value={registerForm.secretCode}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      secretCode: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-yellow-600 mt-2">
                  * รหัสนี้สำหรับอาจารย์เท่านั้น ห้ามเผยแพร่
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={registerForm.fullName}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, fullName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="ชื่อจริง นามสกุล"
              />
            </div>
            {registerForm.role === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลขที่
                  </label>
                  <input
                    type="number"
                    value={registerForm.studentNumber}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        studentNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="เลขที่"
                    min="1"
                  />
                </div>
                
                {/* 🟢 1. เลือก Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ระดับชั้น</label>
                  <select value={registerForm.level} onChange={(e) => setRegisterForm({ ...registerForm, level: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">เลือกระดับชั้น</option>
                    <option value="ปวช.1">ปวช.1</option>
                    <option value="ปวช.2">ปวช.2</option>
                    <option value="ปวช.3">ปวช.3</option>
                    <option value="ปวส.1">ปวส.1</option>
                    <option value="ปวส.2">ปวส.2</option>
                  </select>
                </div>

                {/* 🟢 2. เลือก Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ห้อง</label>
                  <select value={registerForm.room} onChange={(e) => setRegisterForm({ ...registerForm, room: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">ไม่ระบุ</option>
                    <option value="1">ห้อง 1</option>
                    <option value="2">ห้อง 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    แผนก
                  </label>
                  <select
                    value={registerForm.department}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="คอมพิวเตอร์">คอมพิวเตอร์</option>
                  </select>
                </div>
              </>
            )}
            {registerForm.role === "teacher" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แผนก
                </label>
                <select
                  value={registerForm.department}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      department: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="คอมพิวเตอร์">คอมพิวเตอร์</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ยืนยันรหัสผ่าน
              </label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="ยืนยัน password"
              />
            </div>
            <button
              onClick={handleRegister}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              สมัครสมาชิก
            </button>
            <button
              onClick={() => setPage("login")}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              กลับไปเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Student Page
  if (page === "student") {
    const isOffCampus = distanceToCollege
      ? distanceToCollege > MAX_DISTANCE_METERS
      : false;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        {/* ... (Student Page Code - เหมือนเดิม) ... */}
        {/* พี่ขอแปะย่อๆ ตรงนี้นะครับ เพราะโค้ดยาวมาก ถ้าก๊อปไปวางทับไฟล์เดิมได้เลย */}
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-indigo-900">เช็คชื่อนักเรียน</h1>
                <p className="text-gray-600 mt-1">ยินดีต้อนรับ {currentUser?.fullName}</p>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                <LogOut className="w-4 h-4" /> ออกจากระบบ
              </button>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-indigo-700 mb-4">
              <Clock className="w-5 h-5" /> {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-600">เวลาสาย: หลัง {lateTime} น.</div>
          </div>

          {/* Camera Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">ถ่ายรูปเช็คชื่อ</h2>
            {!showCamera && !capturedPhoto && (
              <div className="text-center py-12">
                <Camera className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">กดปุ่มเพื่อเปิดกล้องและถ่ายรูป</p>
                <p className="text-xs text-indigo-500 mb-6 flex items-center justify-center gap-1"><MapPin size={12} /> ระบบจะบันทึกพิกัด GPS อัตโนมัติ</p>
                <div className="flex flex-col gap-3 mt-4">
                   <button onClick={startCamera} className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">เปิดกล้อง</button>
                   <button onClick={() => setShowLeaveModal(true)} className="px-8 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"><FileQuestion size={20} /> ขอลาหยุด</button>
                </div>
              </div>
            )}
            {showCamera && (
              <div className="space-y-4">
                <div className="relative w-full bg-black rounded-lg overflow-hidden h-[400px] md:h-[500px] flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-contain" style={{ transform: "scaleX(-1)" }} />
                  <div className="absolute top-4 left-0 right-0 flex justify-center z-10 px-4">
                    <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg backdrop-blur-md ${isLocating ? "bg-yellow-500/90 text-white" : gpsError ? "bg-red-500/90 text-white" : !isOffCampus ? "bg-green-500/90 text-white" : "bg-red-600/90 text-white"}`}>
                      {isLocating ? <><RefreshCw className="animate-spin w-4 h-4" /> กำลังหาพิกัด...</> : gpsError ? <><AlertTriangle size={16} /> {gpsError}</> : !isOffCampus ? <><MapPin size={16} /> อยู่ในพื้นที่ ({Math.round(distanceToCollege || 0)} ม.)</> : <><AlertTriangle size={16} /> อยู่นอกพื้นที่ ({Math.round(distanceToCollege || 0)} ม.)</>}
                    </div>
                  </div>
                  {!isLocating && isOffCampus && (
                    <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                      <div className="bg-red-600/90 text-white p-6 rounded-xl shadow-2xl mx-6 text-center backdrop-blur-sm animate-pulse border-2 border-white/50">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="text-2xl font-bold mb-2">กรุณาเข้าใกล้โดมในวิทยาลัย</h3>
                        <p className="text-white/90">ระยะห่างปัจจุบัน: {Math.round(distanceToCollege || 0)} เมตร</p>
                        <p className="text-white/90 text-sm mt-1">(ระยะที่ยอมรับได้: {MAX_DISTANCE_METERS} เมตร)</p>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={capturePhoto} disabled={isOffCampus || isLocating} className={`w-full px-6 py-4 text-white rounded-lg font-bold text-lg transition-all ${isOffCampus || isLocating ? "bg-gray-400 cursor-not-allowed opacity-70" : "bg-green-600 hover:bg-green-700 shadow-lg"}`}>{isOffCampus ? "❌ คุณอยู่นอกพื้นที่โดม" : "📸 ถ่ายรูป"}</button>
              </div>
            )}
            {capturedPhoto && (
              <div className="space-y-4">
                <img src={capturedPhoto} alt="Captured" className="w-full rounded-lg" />
                {isOffCampus && (<div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700"><p className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> ไม่สามารถเช็คชื่อได้</p><p>คุณอยู่ห่างจากโดมในวิทยาลัย {Math.round(distanceToCollege || 0)} เมตร กรุณาขยับเข้ามาใกล้กว่านี้</p></div>)}
                <div className="flex gap-3">
                  <button onClick={retakePhoto} className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors">ถ่ายใหม่</button>
                  <button onClick={submitAttendance} disabled={isOffCampus} className={`flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors ${isOffCampus ? "opacity-50 cursor-not-allowed" : ""}`}>ยืนยันเช็คชื่อ</button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
  <h2 className="text-xl font-bold text-gray-800 mb-4">ประวัติการเช็คชื่อของฉัน</h2>
  
  {/* 🟢 Loading UI */}
  {isLoadingStudentHistory ? (
    <div className="flex flex-col items-center justify-center py-12 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-200">
      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-indigo-700 font-semibold text-lg">กำลังโหลดประวัติ...</p>
      <p className="text-indigo-500 text-sm mt-2">โปรดรอสักครู่</p>
    </div>
  ) : (
    <div className="space-y-3">
      {attendanceRecords
        .filter((r) => r.username === currentUser?.username)
        .length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>ยังไม่มีประวัติการเช็คชื่อ</p>
          </div>
        ) : (
          attendanceRecords
            .filter((r) => r.username === currentUser?.username)
            .map((record) => (
              <div key={record.id} onClick={() => toggleExpandRecord(record.id)} className={`rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md ${record.status === "late" ? "bg-orange-50 border-orange-200" : (record.status === "leave" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200")}`}>
                <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
                  {record.status === "leave" ? (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-white shadow-sm shrink-0 bg-blue-100 flex items-center justify-center">
                      <User className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  ) : (
                    <img src={record.photo} alt={record.studentName} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white shadow-sm shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base sm:text-lg text-gray-800 truncate mb-0.5">{formatDate(record.checkInTime)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{formatTime(record.checkInTime)} น.</div>
                    <div className={`text-[10px] sm:text-xs mt-1 flex items-center gap-1 ${record.isOffCampus ? "text-red-500" : "text-green-600"}`}>
                      <MapPin size={10} />
                      {record.isOffCampus ? "นอกพื้นที่" : "ในวิทยาลัย"} ({Math.round(record.distance || 0)} ม.)
                    </div>
                    {record.status === "leave" && record.leaveReason && (
                      <div className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                        <strong>เหตุผล:</strong> {record.leaveReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0">
                    <div className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold mb-1 whitespace-nowrap ${record.status === "late" ? "bg-orange-200 text-orange-800" : (record.status === "leave" ? "bg-blue-500 text-white" : "bg-green-200 text-green-800")}`}>
                      {record.status === "late" ? "สาย" : (record.status === "leave" ? "ลา" : "ทัน")}
                    </div>
                    {expandedRecordId === record.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>
                {expandedRecordId === record.id && (
                  <div className="bg-white p-4 border-t border-gray-100 space-y-3 animate-fade-in">
                    <div className="flex justify-center">
                      {record.status === "leave" ? (
                        <div className="flex flex-col items-center justify-center py-4 bg-blue-50 rounded-lg w-full">
                          <User className="text-blue-300 w-16 h-16 mb-2" />
                          <p className="text-blue-500 font-medium">ลากิจ/ลาป่วย</p>
                        </div>
                      ) : (
                        <img src={record.photo} alt={record.studentName} className="rounded-lg max-h-48 object-contain shadow-sm" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
        )}
    </div>
  )}
</div>
          
          {showLeaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">แบบฟอร์มขอลาหยุด</h3>
                <textarea className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500" rows={4} placeholder="ระบุสาเหตุการลา..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
                <div className="flex gap-3">
                  <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={isSubmittingLeave}>ยกเลิก</button>
                  <button onClick={requestLeave} className={`flex-1 py-2 text-white rounded-lg transition-colors ${isSubmittingLeave ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`} disabled={isSubmittingLeave}>{isSubmittingLeave ? "กำลังส่ง..." : "ส่งคำขอ"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Teacher Page
  if (page === "teacher") {
    const gradesFromRecords = attendanceRecords.map((r) => r.grade);
    const gradesFromUsers = users.filter((u) => u.role === "student").map((u) => u.grade);
    const uniqueGrades = Array.from(new Set([...gradesFromRecords, ...gradesFromUsers])).filter((g) => g).sort();
    const activeGrade = selectedGrade && uniqueGrades.includes(selectedGrade) ? selectedGrade : uniqueGrades[0];
    const gradeRecs = attendanceRecords.filter((r) => { const recordDate = formatDateForInput(r.checkInTime); return r.grade === activeGrade && recordDate === filterDate; });
    const gradePresent = gradeRecs.filter((r) => r.status === "present").length;
    const gradeLate = gradeRecs.filter((r) => r.status === "late").length;
    // 🟢 คำนวณยอดลา
    const gradeLeave = gradeRecs.filter((r) => r.status === "leave").length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div className="text-center sm:text-left"><h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">ระบบจัดการเช็คชื่อ</h1><p className="text-gray-600 mt-1">สำหรับอาจารย์: {currentUser?.fullName}</p></div>
              <div className="flex flex-wrap justify-center gap-2">
                {/* 🎲 ปุ่มสุ่ม */}
                <button onClick={() => setShowRandomModal(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm sm:text-base">
                   <Dices size={16} /> สุ่มชื่อ
                </button>
                
                {/* 👥 ปุ่มจัดกลุ่ม */}
                <button onClick={() => setShowGroupModal(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm sm:text-base">
                   <LayoutGrid size={16} /> จัดกลุ่ม
                </button>
                
                <button onClick={handleSyncData} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm sm:text-base"><RefreshCw size={16} /> ซิงค์ข้อมูลวันนี้</button>
                <button onClick={() => setManageMode(!manageMode)} className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${manageMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>{manageMode ? <Users size={16} /> : <Settings size={16} />}{manageMode ? "กลับไปเช็คชื่อ" : "จัดการนักเรียน"}</button>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm sm:text-base"><LogOut size={16} /> ออกจากระบบ</button>
              </div>
            </div>

         {viewingHistoryStudent ? (
  <div className="bg-white rounded-xl">
    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <h3 className="text-base sm:text-lg font-bold text-gray-700 flex items-center gap-2">
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> 
        ประวัติ: {viewingHistoryStudent.fullName}
      </h3>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-lg border">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">เดือน:</span>
          <input 
            type="month" 
            value={historyFilterMonth} 
            onChange={(e) => setHistoryFilterMonth(e.target.value)} 
            className="bg-transparent text-xs sm:text-sm outline-none w-28 sm:w-auto" 
          />
        </div>
        <button 
          onClick={() => exportToCSV(viewingHistoryStudent)} 
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs sm:text-sm font-medium shadow-sm whitespace-nowrap" 
          title="Export to CSV"
        >
          <FileSpreadsheet size={16} /> Export
        </button>
        <button 
          onClick={() => {
            setViewingHistoryStudent(null);
            setStudentFullHistory([]);
          }} 
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>
    </div>

    {isLoadingHistory ? (
      <div className="flex flex-col items-center justify-center py-16 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-200">
        <RefreshCw className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
        <p className="text-indigo-700 font-bold text-xl">กำลังดาวน์โหลดประวัติ...</p>
        <p className="text-indigo-500 text-sm mt-2">กรุณารอสักครู่</p>
      </div>
    ) : (
      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
        {studentFullHistory.filter((r) => {
          const recordMonth = getYearMonth(new Date(r.checkInTime));
          return recordMonth === historyFilterMonth;
        }).length === 0 ? (
          <p className="text-center text-gray-400 py-8">ไม่มีประวัติในเดือนนี้</p>
        ) : (
          studentFullHistory
            .filter((r) => {
              const recordMonth = getYearMonth(new Date(r.checkInTime));
              return recordMonth === historyFilterMonth;
            })
            .map((record) => (
              <div 
                key={record.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  record.status === "late" 
                    ? "bg-orange-50 border-orange-200" 
                    : (record.status === "leave" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200")
                }`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                  {record.status === "leave" ? (
                    <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                      <User className="text-blue-500 w-5 h-5" />
                    </div>
                  ) : (
                    <img src={record.photo} className="w-full h-full rounded object-cover border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm sm:text-base">
                    {formatDate(record.checkInTime)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(record.checkInTime)} น.
                  </div>
                  {record.status === "leave" && record.leaveReason && (
                    <div className="text-xs text-blue-600 mt-0.5">เหตุผล: {record.leaveReason}</div>
                  )}
                </div>
                <div className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                  record.status === "late" 
                    ? "bg-orange-200 text-orange-800" 
                    : (record.status === "leave" ? "bg-blue-500 text-white" : "bg-green-200 text-green-800")
                }`}>
                  {record.status === "late" ? "สาย" : (record.status === "leave" ? "ลา" : "ทัน")}
                </div>
              </div>
            ))
        )}
      </div>
    )}
  </div>
) : manageMode ? (
  <div className="bg-white rounded-xl">
    <div className="mb-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> 
        จัดการบัญชีนักเรียน ({activeGrade})
      </h3>
      <div className="flex flex-wrap gap-2 mb-6">
        {uniqueGrades.length > 0 ? (
          uniqueGrades.map((g) => (
            <button 
              key={g} 
              onClick={() => setSelectedGrade(g)} 
              className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                activeGrade === g ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {g}
            </button>
          ))
        ) : (
          <div className="text-gray-400 italic">ไม่มีข้อมูลนักเรียน</div>
        )}
      </div>
      <div className="grid gap-3 sm:gap-4">
        {users
          .filter((u) => u.role === "student" && u.grade === activeGrade)
          .sort((a, b) => a.studentNumber - b.studentNumber)
          .map((student) => (
            <div 
              key={student.id} 
              className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 gap-3"
            >
              <div 
                className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:opacity-80 transition" 
                onClick={() => { 
                  loadFullStudentHistory(student); 
                  setHistoryFilterMonth(getYearMonth(new Date())); 
                }} 
                title="กดเพื่อดูประวัติ"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm sm:text-base shrink-0">
                  {student.studentNumber}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 text-sm sm:text-base truncate">
                    {student.fullName}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    User: {student.username}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 ml-auto md:ml-0 w-full md:w-auto justify-end">
                <button onClick={() => { 
                          loadFullStudentHistory(student); 
                              setHistoryFilterMonth(getYearMonth(new Date())); 
                                }} className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-xs sm:text-sm font-medium">
                            <FileText size={14} /> ดูประวัติ
                    </button>
                
                <button 
                  onClick={() => openEditModal(student)} 
                  className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs sm:text-sm font-medium"
                >
                  <Edit size={14} /> แก้ไข
                </button>

                <button 
                  onClick={() => deleteStudentAccount(student.id)} 
                  className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs sm:text-sm font-medium"
                >
                  <UserMinus size={14} /> ลบ
                </button>
              </div>
            </div>
          ))
        }
        {users.filter((u) => u.role === "student" && u.grade === activeGrade).length === 0 && (
          <p className="text-center text-gray-400 py-4">ไม่มีนักเรียนในชั้นนี้</p>
        )}
      </div>
    </div>
  </div>
) : (
  <>
    <div className="mb-6 overflow-x-auto pb-2">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
        เลือกระดับชั้น
      </h3>
      <div className="flex gap-2">
        {uniqueGrades.length > 0 ? (
          uniqueGrades.map((g) => (
            <button 
              key={g} 
              onClick={() => setSelectedGrade(g)} 
              className={`px-4 py-1.5 sm:px-6 sm:py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeGrade === g 
                  ? "bg-indigo-600 text-white shadow-md transform scale-105" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50"
              }`}
            >
              {g}
            </button>
          ))
        ) : (
          <div className="text-gray-400 italic text-sm">ยังไม่มีข้อมูลนักเรียนในระบบ</div>
        )}
      </div>
    </div>
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6 bg-white p-3 rounded-lg border w-full sm:w-fit">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-indigo-600" />
        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">เลือกวันที่ดูข้อมูล:</span>
      </div>
      <input 
        type="date" 
        value={filterDate} 
        onChange={(e) => setFilterDate(e.target.value)} 
        className="outline-none text-indigo-600 font-bold bg-transparent cursor-pointer text-sm sm:text-base w-full sm:w-auto" 
      />
    </div>
    {activeGrade && (
      <div className="bg-indigo-50 p-4 sm:p-6 rounded-xl border border-indigo-100 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-900 flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" /> สรุปยอด ({activeGrade})
          </h2>
          <div className="text-xs sm:text-sm text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm font-bold">
            วันที่: {new Date(filterDate).toLocaleDateString("th-TH", { 
              day: "numeric", 
              month: "long", 
              year: "numeric", 
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-blue-500">
            <div className="text-xl sm:text-3xl font-bold text-blue-900 mb-1">{gradeRecs.length}</div>
            <div className="text-xs sm:text-sm font-medium text-blue-600">มาเรียน</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-green-500">
            <div className="text-xl sm:text-3xl font-bold text-green-900 mb-1">{gradePresent}</div>
            <div className="text-xs sm:text-sm font-medium text-green-600">มาตรงเวลา</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-orange-500">
            <div className="text-xl sm:text-3xl font-bold text-orange-900 mb-1">{gradeLate}</div>
            <div className="text-xs sm:text-sm font-medium text-orange-600">มาสาย</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-pink-500">
            <div className="text-xl sm:text-3xl font-bold text-pink-900 mb-1">{gradeLeave}</div>
            <div className="text-xs sm:text-sm font-medium text-pink-600">ลา</div>
          </div>
        </div>
      </div>
    )}
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-600" />
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">กำหนดเวลาสาย:</label>
      </div>
      <div className="flex w-full sm:w-auto items-center justify-between gap-4">
        <input 
          type="time" 
          value={lateTime} 
          onChange={(e) => setLateTime(e.target.value)} 
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-auto" 
        />
        <div className="ml-auto sm:ml-0 flex items-center gap-2 text-base sm:text-lg font-semibold text-indigo-700">
          <Clock className="w-5 h-5" /> {formatTime(currentTime)}
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mt-6 border border-yellow-200">
      <h2 className="text-lg sm:text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
        <FileQuestion className="w-5 h-5" /> รายการขอลาหยุด
      </h2>
      {leaves.filter(l => l.status === 'pending').length === 0 ? (
        <div className="text-center py-4 text-gray-400">ไม่มีคำขอลาหยุด</div>
      ) : (
        <div className="space-y-3">
          {leaves.filter(l => l.status === 'pending').map(leave => (
            <div key={leave.id} className="p-3 border rounded-lg bg-yellow-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800">
                    {leave.studentName} <span className="text-xs text-gray-500">({leave.grade})</span>
                  </h4>
                  <p className="text-sm text-gray-600">เหตุผล: {leave.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(leave.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleLeaveAction(leave, true)} 
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button 
                    onClick={() => handleLeaveAction(leave, false)} 
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mt-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="bg-indigo-100 text-indigo-800 p-1.5 rounded-lg">
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
        </span> 
        รายชื่อนักเรียน ({activeGrade || "เลือกชั้นเรียน"})
      </h2>
  {/* 🟢 Loading UI - แสดงตอนกำลังโหลดข้อมูล */}
  {isLoadingTeacherData ? (
    <div className="flex flex-col items-center justify-center py-12 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-200 animate-pulse">
      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-indigo-700 font-semibold text-lg">กำลังดาวน์โหลดข้อมูล...</p>
      <p className="text-indigo-500 text-sm mt-2">โปรดรอสักครู่</p>
    </div>
  ) : !activeGrade ? (
    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed text-sm sm:text-base">
      กรุณาเลือกชั้นเรียนด้านบน
    </div>
  ) : gradeRecs.length === 0 ? (
    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed text-sm sm:text-base">
      <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-30" /> 
      ไม่มีการเช็คชื่อในวันที่เลือก
    </div>
  ) : (
    <div className="space-y-3">
      {gradeRecs.sort((a, b) => a.studentNumber - b.studentNumber).map((record, index) => (
        <div 
          key={record.id} 
          onClick={() => toggleExpandRecord(record.id)} 
          className={`rounded-xl border-2 transition-all cursor-pointer hover:shadow-md overflow-hidden ${
            record.status === "late" 
              ? "bg-orange-50 border-orange-200" 
              : (record.status === "leave" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200")
          }`}
        >
          <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-400 w-6 sm:w-8 text-center shrink-0">
              {record.studentNumber}
            </div>
            {/* 🟢 4. ส่วนแสดงรูปในหน้าหลัก (List View) */}
                    {record.status === "leave" ? (
                         <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-white shadow-sm shrink-0 bg-blue-100 flex items-center justify-center">
                           <User className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8" />
                         </div>
                    ) : (
                         <img src={record.photo} alt={record.studentName} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white shadow-sm shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0"><div className="font-bold text-base sm:text-lg text-gray-800 truncate mb-0.5 sm:mb-1">{record.studentName}</div><div className="flex flex-wrap items-center gap-1 sm:gap-2"><span className="bg-white border px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">{record.grade}</span><span className="text-gray-500 text-xs sm:text-sm truncate">{formatDate(record.checkInTime)}</span></div>
                    
                    {/* 🟢 5. แสดงเหตุผลการลา (เพิ่มตรงนี้) */}
                    {record.status === "leave" && record.leaveReason && (
                         <div className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                            <strong>เหตุผล:</strong> {record.leaveReason}
                         </div>
                    )}

                  </div><div className="text-right shrink-0"><div className={`text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 ${record.status === "late" ? "text-orange-600" : (record.status === "leave" ? "text-blue-600" : "text-green-600")}`}>{formatTime(record.checkInTime)}</div><div className={`inline-block px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${record.status === "late" ? "bg-orange-200 text-orange-800" : (record.status === "leave" ? "bg-blue-500 text-white" : "bg-green-200 text-green-800")}`}>{record.status === "late" ? "สาย" : (record.status === "leave" ? "ลา" : "ทันเวลา")}</div></div><div className="pl-1 sm:pl-2 text-gray-400 shrink-0">{expandedRecordId === record.id ? (<ChevronUp size={16} />) : (<ChevronDown size={16} />)}</div></div>{expandedRecordId === record.id && (<div className="bg-white border-t border-gray-100 p-4 animate-fade-in"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1"><p className="text-sm font-bold text-gray-500 mb-2">รูปถ่ายยืนยัน:</p>
                    {/* 🟢 6. ส่วนขยาย (Expanded View) */}
                    {record.status === "leave" ? (
                         <div className="w-full h-48 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-100">
                            <User className="text-blue-300 w-16 h-16 mb-2" />
                            <p className="text-blue-500 font-medium">ลากิจ/ลาป่วย</p>
                         </div>
                    ) : (
                        <img src={record.photo} className="w-full h-48 object-contain bg-black/5 rounded-lg" />
                    )}

                  </div><div className="flex-1 flex flex-col justify-center items-center p-4 bg-gray-50 rounded-lg border border-gray-100"><div className={`flex flex-col items-center gap-2 ${record.isOffCampus ? "text-red-600" : "text-green-600"}`}>{record.isOffCampus ? (<AlertTriangle size={32} />) : (<MapPin size={32} />)}<span className="font-bold text-lg text-center">{record.isOffCampus ? "อยู่นอกพื้นที่" : "อยู่ในพื้นที่วิทยาลัย"}</span><span className="text-sm text-gray-500 text-center">ระยะห่าง: {Math.round(record.distance || 0)} เมตร</span></div><button onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }} className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100 text-sm sm:text-base"><Trash2 size={16} /> ลบรายการนี้</button></div></div></div>)}</div>))}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal สำหรับแก้ไขข้อมูล (Popup) */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลนักเรียน</h3>
                <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่</label>
                  <input 
                    type="number" 
                    value={editForm.studentNumber} 
                    onChange={(e) => setEditForm({...editForm, studentNumber: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    value={editForm.fullName} 
                    onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                {/* 🟢 แก้ไขตรงนี้: แยก Grade เป็น Level และ Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                  <select 
                    value={editForm.level} 
                    onChange={(e) => setEditForm({...editForm, level: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ปวช.1">ปวช.1</option>
                    <option value="ปวช.2">ปวช.2</option>
                    <option value="ปวช.3">ปวช.3</option>
                    <option value="ปวส.1">ปวส.1</option>
                    <option value="ปวส.2">ปวส.2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ห้อง</label>
                  <select 
                    value={editForm.room} 
                    onChange={(e) => setEditForm({...editForm, room: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ไม่ระบุ</option> {/* 🟢 แก้คำตรงนี้ */}
                    <option value="1">ห้อง 1</option>
                    <option value="2">ห้อง 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
                  <select 
                    value={editForm.department} 
                    onChange={(e) => setEditForm({...editForm, department: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="คอมพิวเตอร์">คอมพิวเตอร์</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => changeStudentPassword(editingStudent)} 
                    className="flex-1 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 text-sm font-medium"
                  >
                    เปลี่ยนรหัสผ่าน
                  </button>
                  <button 
                    onClick={saveStudentInfo} 
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex justify-center items-center gap-2"
                  >
                    <Save size={16} /> บันทึก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎲 Random Modal */}
        {showRandomModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <button onClick={() => { setShowRandomModal(false); setRandomResult(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
              
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Dices className="w-10 h-10 text-purple-600 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">สุ่มผู้โชคดี</h3>
                <p className="text-gray-500 text-sm mt-1">จากรายชื่อห้อง {selectedGrade}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 min-h-[120px] flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 relative group">
                {randomResult ? (
                  <div className="text-center animate-pop-in">
                    <span className="text-4xl">😭</span>
                    <p className="text-xl font-bold text-purple-700 mt-2">{randomResult}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm group-hover:text-purple-400 transition-colors">กดปุ่มด้านล่างเพื่อสุ่ม...</p>
                )}
              </div>

              <button 
                onClick={handleRandomStudent} 
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} className={isRolling ? "animate-spin-slow" : ""} /> {isRolling ? "กำลังสุ่ม..." : "สุ่มเลย!"}
              </button>
            </div>
          </div>
        )}

        {/* 👥 Group Modal */}
        {showGroupModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-400"></div>
                    
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <LayoutGrid className="text-orange-500" /> จัดกลุ่มอัตโนมัติ
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">ห้อง {selectedGrade} • ทั้งหมด {users.filter(u => u.role === "student" && u.grade === selectedGrade).length} คน</p>
                        </div>
                        <button onClick={() => { setShowGroupModal(false); setGroups([]); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400" /></button>
                    </div>

                    {/* Controls */}
                    <div className="p-6 bg-orange-50 border-b border-orange-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <label className="text-sm font-bold text-orange-800 whitespace-nowrap">จำนวนคนต่อกลุ่ม:</label>
                            <div className="flex items-center bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
                                <button onClick={() => setGroupSize(Math.max(2, groupSize - 1))} className="px-3 py-2 hover:bg-orange-100 text-orange-600 font-bold border-r">-</button>
                                <input 
                                    type="number" 
                                    min="2" 
                                    value={groupSize} 
                                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)}
                                    className="w-12 text-center outline-none text-gray-700 font-bold py-2 [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button onClick={() => setGroupSize(groupSize + 1)} className="px-3 py-2 hover:bg-orange-100 text-orange-600 font-bold border-l">+</button>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateGroups}
                            className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> สุ่มจัดกลุ่มใหม่
                        </button>
                    </div>

                    {/* Content (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {groups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groups.map((group, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                            <h4 className="font-bold text-gray-800 text-lg">กลุ่มที่ {idx + 1}</h4>
                                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{group.length} คน</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {group.map((student: any, sIdx: number) => (
                                                <li key={sIdx} className="flex items-center gap-2 text-sm text-gray-600">
                                                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                                                        {sIdx + 1}
                                                    </div>
                                                    <span className="truncate">{student.fullName}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <LayoutGrid size={64} className="opacity-20" />
                                <p>กดปุ่ม "สุ่มจัดกลุ่มใหม่" เพื่อเริ่มใช้งาน</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  }

  return null;
}
