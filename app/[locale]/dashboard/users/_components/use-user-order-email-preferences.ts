"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { ManagedUser } from "@/lib/user-management-model";
import { useUnsavedChangesGuard } from "../../_components/use-unsaved-changes-guard";
import { manageUserOrderEmailPreferenceAction } from "../actions";
import { initialUserActionResult } from "./users-feedback";

function persistedPreferences(users: ManagedUser[]) {
  const preferences: Record<string, boolean> = {};
  for (const user of users) {
    if (user.orderEmailPreference) {
      preferences[user.id] = user.orderEmailPreference.enabled;
    }
  }
  return preferences;
}

export function useUserOrderEmailPreferences({
  users,
  unsavedMessage,
}: {
  users: ManagedUser[];
  unsavedMessage: string;
}) {
  const router = useRouter();
  const persisted = useMemo(() => persistedPreferences(users), [users]);
  const [drafts, setDrafts] = useState<Record<string, boolean>>(
    () => persisted,
  );
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [result, action] = useActionState(
    manageUserOrderEmailPreferenceAction,
    initialUserActionResult,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const synchronizedRef = useRef<string | null>(null);
  const previousPersistedRef = useRef(persisted);
  const dirty = users.some((user) => {
    const preference = user.orderEmailPreference;
    return (
      preference !== null &&
      (drafts[user.id] ?? preference.enabled) !== preference.enabled
    );
  });
  const discardAll = useCallback(() => setDrafts(persisted), [persisted]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: dirty,
    message: unsavedMessage,
    onDiscard: discardAll,
  });

  useEffect(() => {
    const previousPersisted = previousPersistedRef.current;
    setDrafts((current) => {
      const next = { ...current };
      for (const [userId, enabled] of Object.entries(persisted)) {
        const previousEnabled = previousPersisted[userId];
        if (
          previousEnabled === undefined ||
          (current[userId] ?? previousEnabled) === previousEnabled
        ) {
          next[userId] = enabled;
        }
      }
      return next;
    });
    previousPersistedRef.current = persisted;
  }, [persisted]);

  useEffect(() => {
    if (result.status === "success") {
      router.refresh();
    } else if (result.status === "error") {
      setPendingTargetId(null);
      errorRef.current?.focus();
    }
  }, [result, router]);

  useEffect(() => {
    if (
      result.status !== "success" ||
      !result.targetId ||
      result.mutationVersion === undefined
    ) return;

    const targetId = result.targetId;
    const mutationVersion = result.mutationVersion;
    const synchronizationKey = `${targetId}:${mutationVersion}`;
    if (synchronizedRef.current === synchronizationKey) return;

    const refreshedPreference = users.find(
      (user) =>
        user.id === targetId &&
        user.orderEmailPreference !== null &&
        user.orderEmailPreference.mutationVersion >= mutationVersion,
    )?.orderEmailPreference;
    if (!refreshedPreference) return;

    setDrafts((current) => ({
      ...current,
      [targetId]: refreshedPreference.enabled,
    }));
    setPendingTargetId(null);
    synchronizedRef.current = synchronizationKey;
  }, [result, users]);

  return {
    action,
    result,
    locked: pendingTargetId !== null,
    errorRef,
    draftFor(user: ManagedUser | null) {
      if (!user?.orderEmailPreference) return false;
      return drafts[user.id] ?? user.orderEmailPreference.enabled;
    },
    isPending(userId: string | undefined) {
      return pendingTargetId === userId;
    },
    change(userId: string, enabled: boolean) {
      setDrafts((current) => ({ ...current, [userId]: enabled }));
    },
    submit(userId: string) {
      setPendingTargetId(userId);
    },
    discard(user: ManagedUser) {
      const preference = user.orderEmailPreference;
      if (!preference) return;
      setDrafts((current) => ({
        ...current,
        [user.id]: preference.enabled,
      }));
    },
  };
}
