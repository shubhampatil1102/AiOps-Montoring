// import { useTheme } from "@/theme/ThemeProvider";



// type Props = {
//   title: string;
//   value: number | string;
//   color: string;
//   subtitle?: string;
// };

// export default function MetricCard({ title, value, color, subtitle }: Props) {
//    const { colors } = useTheme();
//   return (
   
//     <div
//       style={{
//         background: colors.card,
//         border: `1px solid ${colors.border}`,
//         color: colors.text,

//         borderRadius: 14,
//         padding: 18,
//         position: "relative",
//         overflow: "hidden",
//       }}
//     >
//       {/* glow indicator */}
//       <div
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           width: 6,
//           height: "100%",
//           background: color,
//         }}
//       />

//       <div style={{ color: "#9ca3af", fontSize: 13 }}>{title}</div>

//       <div
//         style={{
//           fontSize: 32,
//           fontWeight: 700,
//           marginTop: 6,
//           color: "#e5e7eb",
//         }}
//       >
//         {value}
//       </div>

//       {subtitle && (
//         <div style={{ color: color, marginTop: 6, fontSize: 13 }}>
//           {subtitle}
//         </div>
//       )}
//     </div>
//   );
// }
