import { localizedPath } from "./routes";

export type AudienceContactIntent =
  | { audience: "home"; service: "installation" | "autonomous-home" }
  | { audience: "business"; service: "installation" }
  | {
      audience: "business";
      service: "installation";
      project: "business-property" | "investor-park";
    };

export function audienceContactPath(
  locale: string,
  intent: AudienceContactIntent,
) {
  const query = new URLSearchParams({
    audience: intent.audience,
    service: intent.service,
  });

  if ("project" in intent) {
    query.set("project", intent.project);
  }

  return `${localizedPath(locale, "contact")}?${query.toString()}`;
}
