import { getDeviceState } from "@/utils/deviceState";

export default function DeviceStateBadge({ state }: any) {

  const s = getDeviceState(state);

  return (
    <div style={{
      display:"flex",
      alignItems:"center",
      gap:8
    }}>
      <div style={{
        width:10,
        height:10,
        borderRadius:20,
        background:s.color,
        boxShadow:`0 0 6px ${s.color}`
      }}/>

      <span style={{fontSize:13}}>
        {s.label}
      </span>
    </div>
  );
}
