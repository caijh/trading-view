import { redirect } from "next/navigation";

export default function Home() {
    // 访问 `/` 时跳转到默认股票 AAPL.NS
    redirect("/chart?code=SPX.NS");
}
