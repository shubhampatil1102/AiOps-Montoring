import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout(){

  return(
    <div style={{display:"flex"}}>

      <Sidebar/>

      <div style={{
        flex:1,
        background:"#ffffff",
        minHeight:"100vh",
        padding:20,
        color:"black"
      }}>
        <Outlet/>
      </div>

    </div>
  )
}