import { ArrowRight, Globe, UserRound, Search, MoreHorizontal, Clock3 } from "lucide-react";

const investigations = [
    {
        name: "Example Username Search",
        description: "@exampleuser",
        type: "Username",
        icon: UserRound,
        updated: "2 hours ago",
        status: "Active"
    },
    {
        name: "Example Domain Lookup",
        description: "example.com",
        type: "Domain",
        icon: Globe,
        updated: "Yesterday",
        status: "Completed"
    },
    {
        name: "Example Profile Search",
        description: "Public profile investigation",
        type: "Public Profile",
        icon: Search,
        updated: "3 days ago",
        status: "Paused"
    }
];
