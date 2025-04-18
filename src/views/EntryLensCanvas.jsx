import { useVisData } from "../store/visData.js";
import GlyphMatrix        from "../components/GlyphMatrix.jsx";
import ConcordanceRibbon  from "../components/ConcordanceRibbon.jsx";
import XrefArcBand        from "../components/XrefArcBand.jsx";
import EntryLensPanel     from "../components/EntryLensPanel.jsx";

export default function EntryLensCanvas() {
  const { ready, glyphMx, pairs } = useVisData();
  if (!ready) return <p style={{padding:"2rem"}}>loading vis data…</p>;

  return (
    <div style={{display:"grid",gap:"1rem",padding:"1rem"}}>
      <GlyphMatrix       data={glyphMx} />
      <ConcordanceRibbon data={pairs}  />
      <XrefArcBand />
      <EntryLensPanel />
    </div>
  );
}
