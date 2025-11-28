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
} from "firebase/firestore";


const COLLEGE_LAT = 14.105260105890562;
const COLLEGE_LNG = 100.32044313706368;
const MAX_DISTANCE_METERS = 50; 


const TEACHER_SECRET_CODE = "3399";


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


function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
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

export default function PhotoAttendanceSystem() {
  // --- ส่วนที่ 1: Logic & State ---
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [page, setPage] = useState("login");

  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const [manageMode, setManageMode] = useState(false);
  const [viewingHistoryStudent, setViewingHistoryStudent] = useState<any>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [users, setUsers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lateTime, setLateTime] = useState("08:00");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "student",
    studentNumber: "",
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

  useEffect(() => {
    if (!firebaseUser || !db) return;

    const usersQuery = query(collection(db, "users"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const loadedUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(loadedUsers);
    });

    const attendanceQuery = query(collection(db, "attendance"));
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
      setAttendanceRecords(loadedRecords);
    });

    return () => {
      unsubUsers();
      unsubAttendance();
    };
  }, [firebaseUser]);

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

    if (
      registerForm.role === "student" &&
      (!registerForm.studentNumber || !registerForm.grade)
    )
      return alert("กรอกข้อมูลนักเรียนให้ครบ");

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
      newUser.grade = registerForm.grade;
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
      alert(
        `❌ ไม่สามารถเช็คชื่อได้!\n\nคุณอยู่นอกโดมในวิทยาลัย (ห่าง ${Math.round(
          distanceToCollege || 0
        )} ม.)\nกรุณาขยับเข้ามาในรัศมี ${MAX_DISTANCE_METERS} เมตร`
      );
      return;
    }

    const now = new Date();
    const [h, m] = lateTime.split(":");
    const isLate =
      now.getHours() > parseInt(h) ||
      (now.getHours() === parseInt(h) && now.getMinutes() > parseInt(m));

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
      await addDoc(collection(db, "attendance"), newRecord);
      setCapturedPhoto(null);
      alert("เช็คชื่อสำเร็จ! บันทึกลงฐานข้อมูลแล้ว");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
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

  // --- UI Components ---

  if (page === "login") {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ระดับชั้น
                  </label>
                  <select
                    value={registerForm.grade}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        grade: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">เลือกระดับชั้น</option>
                    <option value="ปวช.1">ปวช.1</option>
                    <option value="ปวช.2">ปวช.2</option>
                    <option value="ปวช.3">ปวช.3</option>
                    <option value="ปวส.1">ปวส.1</option>
                    <option value="ปวส.2">ปวส.2</option>
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-indigo-900">
                  เช็คชื่อนักเรียน
                </h1>
                <p className="text-gray-600 mt-1">
                  ยินดีต้อนรับ {currentUser?.fullName}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <LogOut className="w-4 h-4" /> ออกจากระบบ
              </button>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-indigo-700 mb-4">
              <Clock className="w-5 h-5" /> {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-600">
              เวลาสาย: หลัง {lateTime} น.
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ถ่ายรูปเช็คชื่อ
            </h2>

            {!showCamera && !capturedPhoto && (
              <div className="text-center py-12">
                <Camera className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">
                  กดปุ่มเพื่อเปิดกล้องและถ่ายรูป
                </p>
                <p className="text-xs text-indigo-500 mb-6 flex items-center justify-center gap-1">
                  <MapPin size={12} /> ระบบจะบันทึกพิกัด GPS อัตโนมัติ
                </p>
                <button
                  onClick={startCamera}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  เปิดกล้อง
                </button>
              </div>
            )}

            {showCamera && (
              <div className="space-y-4">
                <div className="relative w-full bg-black rounded-lg overflow-hidden h-[400px] md:h-[500px] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute top-0 left-0 w-full h-full object-contain"
                    style={{ transform: "scaleX(-1)" }}
                  />

                  <div className="absolute top-4 left-0 right-0 flex justify-center z-10 px-4">
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg backdrop-blur-md ${
                        isLocating
                          ? "bg-yellow-500/90 text-white"
                          : gpsError
                          ? "bg-red-500/90 text-white"
                          : !isOffCampus
                          ? "bg-green-500/90 text-white"
                          : "bg-red-600/90 text-white"
                      }`}
                    >
                      {isLocating ? (
                        <>
                          <RefreshCw className="animate-spin w-4 h-4" />{" "}
                          กำลังหาพิกัด...
                        </>
                      ) : gpsError ? (
                        <>
                          <AlertTriangle size={16} /> {gpsError}
                        </>
                      ) : !isOffCampus ? (
                        <>
                          <MapPin size={16} /> อยู่ในพื้นที่ (
                          {Math.round(distanceToCollege || 0)} ม.)
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} /> อยู่นอกพื้นที่ (
                          {Math.round(distanceToCollege || 0)} ม.)
                        </>
                      )}
                    </div>
                  </div>

                  {!isLocating && isOffCampus && (
                    <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                      <div className="bg-red-600/90 text-white p-6 rounded-xl shadow-2xl mx-6 text-center backdrop-blur-sm animate-pulse border-2 border-white/50">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="text-2xl font-bold mb-2">
                          กรุณาเข้าใกล้โดมในวิทยาลัย
                        </h3>
                        <p className="text-white/90">
                          ระยะห่างปัจจุบัน: {Math.round(distanceToCollege || 0)}{" "}
                          เมตร
                        </p>
                        <p className="text-white/90 text-sm mt-1">
                          (ระยะที่ยอมรับได้: {MAX_DISTANCE_METERS} เมตร)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={capturePhoto}
                  disabled={isOffCampus || isLocating}
                  className={`w-full px-6 py-4 text-white rounded-lg font-bold text-lg transition-all ${
                    isOffCampus || isLocating
                      ? "bg-gray-400 cursor-not-allowed opacity-70"
                      : "bg-green-600 hover:bg-green-700 shadow-lg"
                  }`}
                >
                  {isOffCampus ? "❌ อยู่นอกพื้นที่" : "📸 ถ่ายรูป"}
                </button>
              </div>
            )}

            {capturedPhoto && (
              <div className="space-y-4">
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full rounded-lg"
                />

                {isOffCampus && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                    <p className="font-bold flex items-center gap-2">
                      <AlertTriangle size={18} /> ไม่สามารถเช็คชื่อได้
                    </p>
                    <p>
                      คุณอยู่ห่างจากวิทยาลัย{" "}
                      {Math.round(distanceToCollege || 0)} เมตร
                      กรุณาขยับเข้ามาใกล้กว่านี้
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  >
                    ถ่ายใหม่
                  </button>
                  <button
                    onClick={submitAttendance}
                    disabled={isOffCampus}
                    className={`flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors ${
                      isOffCampus ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    ยืนยันเช็คชื่อ
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ประวัติการเช็คชื่อของฉัน
            </h2>
            <div className="space-y-3">
              {attendanceRecords
                .filter((r) => r.username === currentUser?.username)
                .map((record) => (
                  <div
                    key={record.id}
                    onClick={() => toggleExpandRecord(record.id)}
                    className={`rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                      record.status === "late"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
                      <img
                        src={record.photo}
                        alt={record.studentName}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base sm:text-lg text-gray-800 truncate mb-0.5">
                          {formatDate(record.checkInTime)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {formatTime(record.checkInTime)} น.
                        </div>
                        <div
                          className={`text-[10px] sm:text-xs mt-1 flex items-center gap-1 ${
                            record.isOffCampus ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          <MapPin size={10} />
                          {record.isOffCampus
                            ? "นอกพื้นที่"
                            : "ในวิทยาลัย"}{" "}
                          ({Math.round(record.distance || 0)} ม.)
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0">
                        <div
                          className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold mb-1 whitespace-nowrap ${
                            record.status === "late"
                              ? "bg-orange-200 text-orange-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {record.status === "late" ? "สาย" : "ทัน"}
                        </div>
                        {expandedRecordId === record.id ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* --- Expanded Details --- */}
                    {expandedRecordId === record.id && (
                      <div className="bg-white p-4 border-t border-gray-100 space-y-3 animate-fade-in">
                        <div className="flex justify-center">
                          <img
                            src={record.photo}
                            className="rounded-lg max-h-48 object-contain shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Page
  if (page === "teacher") {
    // หา Grade ทั้งหมดจากข้อมูลที่มี
    const gradesFromRecords = attendanceRecords.map((r) => r.grade);
    const gradesFromUsers = users
      .filter((u) => u.role === "student")
      .map((u) => u.grade);
    const uniqueGrades = Array.from(
      new Set([...gradesFromRecords, ...gradesFromUsers])
    )
      .filter((g) => g)
      .sort();
    const activeGrade =
      selectedGrade && uniqueGrades.includes(selectedGrade)
        ? selectedGrade
        : uniqueGrades[0];

    // Filter ข้อมูลตาม Grade และ Date
    const gradeRecs = attendanceRecords.filter((r) => {
      const recordDate = formatDateForInput(r.checkInTime); // แปลงเป็น YYYY-MM-DD
      return r.grade === activeGrade && recordDate === filterDate;
    });

    const gradePresent = gradeRecs.filter(
      (r) => r.status === "present"
    ).length;
    const gradeLate = gradeRecs.filter((r) => r.status === "late").length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">
                  ระบบจัดการเช็คชื่อ
                </h1>
                <p className="text-gray-600 mt-1">
                  สำหรับอาจารย์: {currentUser?.fullName}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setManageMode(!manageMode)}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    manageMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {manageMode ? <Users size={16} /> : <Settings size={16} />}
                  {manageMode ? "กลับไปเช็คชื่อ" : "จัดการนักเรียน"}
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm sm:text-base"
                >
                  <LogOut size={16} /> ออกจากระบบ
                </button>
              </div>
            </div>

            {/* --- MODE: ดูประวัติรายบุคคล (Viewing History Student) --- */}
            {viewingHistoryStudent ? (
              <div className="bg-white rounded-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />{" "}
                    ประวัติ: {viewingHistoryStudent.fullName}
                  </h3>
                  <button
                    onClick={() => setViewingHistoryStudent(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                  {attendanceRecords
                    .filter((r) => r.username === viewingHistoryStudent.username)
                    .sort((a, b) => b.checkInTime - a.checkInTime)
                    .map((record) => (
                      <div
                        key={record.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          record.status === "late"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <img
                          src={record.photo}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm sm:text-base">
                            {formatDate(record.checkInTime)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(record.checkInTime)} น.
                          </div>
                        </div>
                        <div
                          className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                            record.status === "late"
                              ? "bg-orange-200 text-orange-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {record.status === "late" ? "สาย" : "ทัน"}
                        </div>
                      </div>
                    ))}
                  {attendanceRecords.filter(
                    (r) => r.username === viewingHistoryStudent.username
                  ).length === 0 && (
                    <p className="text-center text-gray-400 py-8">
                      ไม่มีประวัติการเช็คชื่อ
                    </p>
                  )}
                </div>
              </div>
            ) : manageMode ? (
              // --- MODE: จัดการนักเรียน ---
              <div className="bg-white rounded-xl">
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />{" "}
                    จัดการบัญชีนักเรียน ({activeGrade})
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {uniqueGrades.length > 0 ? (
                      uniqueGrades.map((g) => (
                        <button
                          key={g}
                          onClick={() => setSelectedGrade(g)}
                          className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                            activeGrade === g
                              ? "bg-blue-600 text-white shadow"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {g}
                        </button>
                      ))
                    ) : (
                      <div className="text-gray-400 italic">
                        ไม่มีข้อมูลนักเรียน
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:gap-4">
                    {users
                      .filter(
                        (u) => u.role === "student" && u.grade === activeGrade
                      )
                      .sort((a, b) => a.studentNumber - b.studentNumber)
                      .map((student) => (
                        <div
                          key={student.id}
                          className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 gap-3"
                        >
                          <div
                            className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:opacity-80 transition"
                            onClick={() => setViewingHistoryStudent(student)}
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
                            <button
                              onClick={() => setViewingHistoryStudent(student)}
                              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-xs sm:text-sm font-medium"
                            >
                              <FileText size={14} /> ดูประวัติ
                            </button>
                            <button
                              onClick={() => changeStudentPassword(student)}
                              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs sm:text-sm font-medium"
                            >
                              <Edit size={14} /> แก้รหัส
                            </button>
                            <button
                              onClick={() => deleteStudentAccount(student.id)}
                              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs sm:text-sm font-medium"
                            >
                              <UserMinus size={14} /> ลบ
                            </button>
                          </div>
                        </div>
                      ))}
                    {users.filter(
                      (u) => u.role === "student" && u.grade === activeGrade
                    ).length === 0 && (
                      <p className="text-center text-gray-400 py-4">
                        ไม่มีนักเรียนในชั้นนี้
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // --- MODE: เช็คชื่อปกติ (Attendance View) ---
              <>
                {/* Tabs */}
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
                      <div className="text-gray-400 italic text-sm">
                        ยังไม่มีข้อมูลนักเรียนในระบบ
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Date Filter (เพิ่มใหม่) --- */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6 bg-white p-3 rounded-lg border w-full sm:w-fit">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      เลือกวันที่ดูข้อมูล:
                    </span>
                  </div>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="outline-none text-indigo-600 font-bold bg-transparent cursor-pointer text-sm sm:text-base w-full sm:w-auto"
                  />
                </div>

                {/* Summary Cards (แสดงยอดของวันที่เลือก) */}
                {activeGrade && (
                  <div className="bg-indigo-50 p-4 sm:p-6 rounded-xl border border-indigo-100 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6" /> สรุปยอด ({activeGrade})
                      </h2>
                      <div className="text-xs sm:text-sm text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm font-bold">
                        วันที่:{" "}
                        {new Date(filterDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6">
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-blue-500">
                        <div className="text-xl sm:text-3xl font-bold text-blue-900 mb-1">
                          {gradeRecs.length}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-blue-600">
                          มาเรียน
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-green-500">
                        <div className="text-xl sm:text-3xl font-bold text-green-900 mb-1">
                          {gradePresent}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-green-600">
                          มาตรงเวลา
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border-l-4 border-orange-500">
                        <div className="text-xl sm:text-3xl font-bold text-orange-900 mb-1">
                          {gradeLate}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-orange-600">
                          มาสาย
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      กำหนดเวลาสาย:
                    </label>
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

                {/* Student List (Updated Design) */}
                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 p-1.5 rounded-lg">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                    รายชื่อนักเรียน ({activeGrade || "เลือกชั้นเรียน"})
                  </h2>

                  {!activeGrade ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed text-sm sm:text-base">
                      กรุณาเลือกชั้นเรียนด้านบน
                    </div>
                  ) : gradeRecs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed text-sm sm:text-base">
                      <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-30" />{" "}
                      ไม่มีการเช็คชื่อในวันที่เลือก
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gradeRecs
                        .sort((a, b) => a.studentNumber - b.studentNumber)
                        .map((record, index) => (
                          <div
                            key={record.id}
                            onClick={() => toggleExpandRecord(record.id)}
                            className={`rounded-xl border-2 transition-all cursor-pointer hover:shadow-md overflow-hidden ${
                              record.status === "late"
                                ? "bg-orange-50 border-orange-200"
                                : "bg-green-50 border-green-200"
                            }`}
                          >
                            {/* --- Card Header (Visible) --- */}
                            <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
                              <div className="text-xl sm:text-2xl font-bold text-gray-400 w-6 sm:w-8 text-center shrink-0">
                                {record.studentNumber}
                              </div>

                              <img
                                src={record.photo}
                                alt={record.studentName}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white shadow-sm shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base sm:text-lg text-gray-800 truncate mb-0.5 sm:mb-1">
                                  {record.studentName}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span className="bg-white border px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">
                                    {record.grade}
                                  </span>
                                  <span className="text-gray-500 text-xs sm:text-sm truncate">
                                    {formatDate(record.checkInTime)}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 ${
                                    record.status === "late"
                                      ? "text-orange-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {formatTime(record.checkInTime)}
                                </div>
                                <div
                                  className={`inline-block px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                                    record.status === "late"
                                      ? "bg-orange-200 text-orange-800"
                                      : "bg-green-200 text-green-800"
                                  }`}
                                >
                                  {record.status === "late"
                                    ? "มาสาย"
                                    : "ทันเวลา"}
                                </div>
                              </div>

                              <div className="pl-1 sm:pl-2 text-gray-400 shrink-0">
                                {expandedRecordId === record.id ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </div>
                            </div>

                            {/* --- Expanded Content (Hidden by default) --- */}
                            {expandedRecordId === record.id && (
                              <div className="bg-white border-t border-gray-100 p-4 animate-fade-in">
                                <div className="flex flex-col md:flex-row gap-4">
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-500 mb-2">
                                      รูปถ่ายยืนยัน:
                                    </p>
                                    <img
                                      src={record.photo}
                                      className="w-full h-48 object-contain bg-black/5 rounded-lg"
                                    />
                                  </div>
                                  <div className="flex-1 flex flex-col justify-center items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div
                                      className={`flex flex-col items-center gap-2 ${
                                        record.isOffCampus
                                          ? "text-red-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {record.isOffCampus ? (
                                        <AlertTriangle size={32} />
                                      ) : (
                                        <MapPin size={32} />
                                      )}
                                      <span className="font-bold text-lg text-center">
                                        {record.isOffCampus
                                          ? "อยู่นอกพื้นที่"
                                          : "อยู่ในพื้นที่วิทยาลัย"}
                                      </span>
                                      <span className="text-sm text-gray-500 text-center">
                                        ระยะห่าง:{" "}
                                        {Math.round(record.distance || 0)} เมตร
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteRecord(record.id);
                                      }}
                                      className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100 text-sm sm:text-base"
                                    >
                                      <Trash2 size={16} /> ลบรายการนี้
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
