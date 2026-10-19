import ApplyButton from "@/components/vacancies/ApplyButton";
import CompleteProfileNotice from "@/components/vacancies/CompleteProfileNotice";

type Props = {
  vacancyId: string;
  positionLabel: string;
  teamName: string;
  applied: boolean;
  hasPlayerProfile: boolean;
};

export default function VacancyApplyControl({ hasPlayerProfile, ...props }: Props) {
  return hasPlayerProfile ? <ApplyButton {...props} /> : <CompleteProfileNotice />;
}
