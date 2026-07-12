"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Star, AlertTriangle, ShieldCheck, ThumbsUp, ArrowUp, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const getBadgeIcon = (badge: string) => {
  switch (badge) {
    case "Asset Guardian": return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
    case "Perfect Record": return <Star className="h-4 w-4 text-yellow-500" />;
    case "Needs Improvement": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "New Starter": return <ThumbsUp className="h-4 w-4 text-blue-500" />;
    default: return <Medal className="h-4 w-4" />;
  }
};

const getBadgeStyle = (badge: string) => {
  switch (badge) {
    case "Asset Guardian": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Perfect Record": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "Needs Improvement": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "New Starter": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default: return "bg-secondary text-secondary-foreground";
  }
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="mx-auto flex max-w-5xl justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="p-4 bg-primary/10 rounded-full animate-bounce">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500">
          Asset Care Leaderboard
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          We reward employees who take great care of company assets. Earn points by returning items in perfect condition and unlock exclusive badges!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {/* Top 3 Podium */}
        {leaderboard.slice(0, 3).map((emp, idx) => (
          <Card key={emp.id} className={`relative overflow-hidden border-2 transition-transform hover:scale-105 duration-300 ${
            idx === 0 ? "border-yellow-500 shadow-yellow-500/20 md:-translate-y-4 shadow-2xl" : 
            idx === 1 ? "border-slate-400 shadow-slate-400/20 shadow-xl" : 
            "border-amber-700 shadow-amber-700/20 shadow-xl"
          }`}>
            <div className={`absolute top-0 right-0 p-4 text-3xl font-black opacity-20 ${
                idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-700"
            }`}>#{idx + 1}</div>
            <CardContent className="flex flex-col items-center p-6 text-center space-y-4">
              <Avatar className={`h-24 w-24 ring-4 ${idx === 0 ? "ring-yellow-500" : idx === 1 ? "ring-slate-400" : "ring-amber-700"}`}>
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-background to-secondary">
                  {emp.name.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-xl">{emp.name}</h3>
                <p className="text-sm text-muted-foreground">{emp.role}</p>
              </div>
              <div className="flex items-center gap-2 text-2xl font-black tracking-tight">
                <Zap className={`h-6 w-6 ${idx === 0 ? "text-yellow-500 fill-yellow-500" : "text-primary fill-primary"}`} />
                {emp.points} <span className="text-sm text-muted-foreground font-normal">pts</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {emp.badges.map((b: string) => (
                  <Badge key={b} variant="outline" className={`flex items-center gap-1.5 px-2 py-1 ${getBadgeStyle(b)}`}>
                    {getBadgeIcon(b)} {b}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4 font-semibold text-muted-foreground border-b bg-muted/30">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Employee</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-2 text-center">Returned</div>
          <div className="col-span-3">Achievements</div>
        </div>
        <div className="divide-y divide-border">
          {leaderboard.slice(3).map((emp, idx) => (
            <div key={emp.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-accent/30 transition-colors">
              <div className="col-span-1 text-center font-bold text-lg text-muted-foreground">
                #{idx + 4}
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {emp.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                </div>
              </div>
              <div className="col-span-2 flex justify-center items-center gap-1 font-bold">
                {emp.points}
              </div>
              <div className="col-span-2 text-center text-sm font-medium">
                {emp.returned}
              </div>
              <div className="col-span-3 flex flex-wrap gap-1.5">
                {emp.badges.map((b: string) => (
                  <Badge key={b} variant="outline" className={`flex items-center gap-1 text-[10px] ${getBadgeStyle(b)}`}>
                    {getBadgeIcon(b)} <span className="hidden sm:inline">{b}</span>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {leaderboard.length <= 3 && (
            <div className="p-8 text-center text-muted-foreground">
              No more employees to show.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
