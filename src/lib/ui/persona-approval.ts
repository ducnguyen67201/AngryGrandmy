export function canDispatchSuggestedPersonas({
  hasAnalysis,
  personasAccepted,
  authorized,
  loading,
  dispatching,
}: {
  hasAnalysis: boolean;
  personasAccepted: boolean;
  authorized: boolean;
  loading: boolean;
  dispatching: boolean;
}) {
  return (
    hasAnalysis &&
    personasAccepted &&
    authorized &&
    !loading &&
    !dispatching
  );
}
