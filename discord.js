const globalBase = "https://discord.com/api/v9"
const Discord = {
    token: null,
    login(token) {
        this.token = token;
    },
    userProfileURL(id) {
        return globalBase + `/users/${id}/profile?with_mutual_guilds=true&with_mutual_friends=true&with_mutual_friends_count=false`;
    },
    async userProfile(id) {
        if (!this.token) throw Error("Cannot fetch profiles without a token");
        let profile = await fetch(this.userProfileURL(id), {
            headers: {
                "authorization": this.token,
                "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "macOS",
                "x-debug-options": "bugReporterEnabled",
                "x-discord-locale": "en-US",
                "x-discord-timezone": "America/Chicago",
                "x-super-properties": "eyJvcyI6Ik1hYyBPUyBYIiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMjguMC4wLjAgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjEyOC4wLjAuMCIsIm9zX3ZlcnNpb24iOiIxMC4xNS43IiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjMyMzUzOSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=",
            },
            body: null,
            method: "GET"
        });
        let profileData = await profile.json();
        return profileData;
    }
};

module.exports = Discord;