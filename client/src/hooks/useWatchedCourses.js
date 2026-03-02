import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Syncs the current user's watched courses sub-collection in Firestore.
 * Schema: users/{uid}/watchedCourses/{courseNo}
 *   { CourseNo, CourseName, CourseTeacher, Semester, addedAt }
 */
export function useWatchedCourses(uid) {
  const [watchedCourses, setWatchedCourses] = useState([]); // array of { CourseNo, ... }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setWatchedCourses([]);
      return;
    }

    setLoading(true);
    const colRef = collection(db, "users", uid, "watchedCourses");

    const unsub = onSnapshot(colRef, (snap) => {
      setWatchedCourses(snap.docs.map((d) => d.data()));
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  const watchCourse = useCallback(
    async (course) => {
      if (!uid) return;
      const ref = doc(db, "users", uid, "watchedCourses", course.CourseNo);
      await setDoc(ref, {
        CourseNo: course.CourseNo,
        CourseName: course.CourseName,
        CourseTeacher: course.CourseTeacher ?? "",
        Semester: course.Semester ?? "",
        // Enrollment fields needed for the watchlist table display
        Restrict1: course.Restrict1 ?? "",
        ChooseStudent: course.ChooseStudent ?? 0,
        CreditPoint: course.CreditPoint ?? "",
        ClassRoomNo: course.ClassRoomNo ?? "",
        Node: course.Node ?? "",
        addedAt: serverTimestamp(),
      });
    },
    [uid],
  );

  const unwatchCourse = useCallback(
    async (courseNo) => {
      if (!uid) return;
      const ref = doc(db, "users", uid, "watchedCourses", courseNo);
      await deleteDoc(ref);
    },
    [uid],
  );

  const isWatched = useCallback(
    (courseNo) => watchedCourses.some((c) => c.CourseNo === courseNo),
    [watchedCourses],
  );

  /** Toggle the notifyEnabled flag on a watched course. */
  const toggleNotify = useCallback(
    async (courseNo) => {
      if (!uid) return;
      const ref = doc(db, "users", uid, "watchedCourses", courseNo);
      const current = watchedCourses.find((c) => c.CourseNo === courseNo);
      await updateDoc(ref, {
        notifyEnabled: !(current?.notifyEnabled ?? false),
      });
    },
    [uid, watchedCourses],
  );

  /** Returns true if notifications are enabled for the given course. */
  const isNotifyEnabled = useCallback(
    (courseNo) => {
      const course = watchedCourses.find((c) => c.CourseNo === courseNo);
      return course?.notifyEnabled ?? false;
    },
    [watchedCourses],
  );

  return {
    watchedCourses,
    loading,
    watchCourse,
    unwatchCourse,
    isWatched,
    toggleNotify,
    isNotifyEnabled,
  };
}
