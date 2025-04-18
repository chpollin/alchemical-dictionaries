/* tiny coloured pill for section / lang labels
   usage:  <Badge tone="green">LAT‑DE</Badge>
           <Badge>count</Badge>             // default grey
*/
import './badge.css';

export default function Badge({ children, tone = 'default', style = {} }) {
  return (
    <span className={`badge badge--${tone}`} style={style}>
      {children}
    </span>
  );
}
