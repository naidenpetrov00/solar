export type EditorSection = "general" | "content" | "specifications" | "cover";

export type LifecycleIntent = "publish" | "unpublish" | "archive" | "restore";

export type FieldCopy = {
  label: string;
  help: string;
  example?: string;
};
