import Link from "next/link";

import { LINK_CLASS } from "@/components/vacancies/styles";
import { APPLY_ERROR_MESSAGES } from "@/lib/format/applicationLabels";
import { RouteConstants } from "@/lib/routes";

export default function CompleteProfileNotice() {
  return (
    <Link href={RouteConstants.profile.edit} className={LINK_CLASS}>
      {APPLY_ERROR_MESSAGES.profileIncomplete}
    </Link>
  );
}
