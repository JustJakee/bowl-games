const gamesWithTimes = [
    {
      game: "Salute to Veterans Bowl",
      team1: "South Alabama",
      team2: "Western Michigan",
      winner: "",
      date: "0",
      time: "2024-12-14T20:00:00",
    },
    {
      game: "Celebration Bowl",
      team1: "South Carolina State",
      team2: "Jackson State",
      winner: "",
      date: "1",
      time: "2024-12-14T11:00:00",
    },
    {
      game: "Frisco Bowl",
      team1: "Memphis",
      team2: "West Virginia",
      winner: "",
      date: "2",
      time: "2024-12-17T19:00:00",
    },
    {
      game: "Boca Raton Bowl",
      team1: "James Madison",
      team2: "Western Kentucky",
      winner: "",
      date: "3",
      time: "2024-12-18T16:30:00",
    },
    {
      game: "LA Bowl",
      team1: "UNLV",
      team2: "Cal",
      winner: "",
      date: "4",
      time: "2024-12-18T20:00:00",
    },
    {
      game: "New Orleans Bowl",
      team1: "Sam Houston",
      team2: "Georgia Southern",
      winner: "",
      date: "5",
      time: "2024-12-19T18:00:00",
    },
    {
      game: "Cure Bowl",
      team1: "Ohio",
      team2: "Jacksonville State",
      winner: "",
      date: "6",
      time: "2024-12-20T10:00:00",
    },
    {
      game: "Gasparilla Bowl",
      team1: "Florida",
      team2: "Tulane",
      winner: "",
      date: "7",
      time: "2024-12-20T13:30:00",
    },
    {
      game: " College Football Playoff First Round Game  ",
      team1: "Indiana",
      team2: "Notre Dame",
      winner: "",
      date: "8",
      time: "2024-12-20T19:00:00",
    },
    {
      game: "College Football Playoff First Round Game ",
      team1: "SMU",
      team2: "Penn State",
      winner: "",
      date: "9",
      time: "2024-12-21T11:00:00",
    },
    {
      game: " College Football Playoff First Round Game ",
      team1: "Clemson",
      team2: "Texas",
      winner: "",
      date: "10",
      time: "2024-12-21T15:00:00",
    },
    {
      game: " College Football Playoff First Round Game",
      team1: "Tennessee",
      team2: "Ohio State",
      winner: "",
      date: "11",
      time: "2024-12-21T19:00:00",
    },
    {
      game: "Myrtle Beach Bowl",
      team1: "Coastal Carolina",
      team2: "UTSA",
      winner: "",
      date: "12",
      time: "2024-12-22T14:00:00",
    },
    {
      game: "Famous Idaho Potato Bowl",
      team1: "Northern Illinois",
      team2: "Fresno State",
      winner: "",
      date: "13",
      time: "2024-12-23T14:30:00",
    },
    {
      game: "Hawai'i Bowl",
      team1: "South Florida",
      team2: "San Jose State",
      winner: "",
      date: "14",
      time: "2024-12-24T19:00:00",
    },
    {
      game: "GameAbove Sports Bowl",
      team1: "Pitt",
      team2: "Toledo",
      winner: "",
      date: "15",
      time: "2024-12-25T14:00:00",
    },
    {
      game: "Rate Bowl",
      team1: "Rutgers",
      team2: "Kansas State",
      winner: "",
      date: "16",
      time: "2024-12-26T11:00:00",
    },
    {
      game: "68 Ventures Bowl",
      team1: "Arkansas State",
      team2: "Bowling Green",
      winner: "",
      date: "17",
      time: "2024-12-26T15:00:00",
    },
    {
      game: "Holiday Bowl",
      team1: "Syracuse",
      team2: "Washington State",
      winner: "",
      date: "18",
      time: "2024-12-26T19:00:00",
    },
    {
      game: "Birmingham Bowl",
      team1: "Georgia Tech",
      team2: "Vanderbilt",
      winner: "",
      date: "19",
      time: "2024-12-27T11:00:00",
    },
    {
      game: "Armed Forces Bowl",
      team1: "Navy",
      team2: "Oklahoma",
      winner: "",
      date: "20",
      time: "2024-12-27T15:00:00",
    },
    {
      game: "Liberty Bowl",
      team1: "Arkansas",
      team2: "Texas Tech",
      winner: "",
      date: "21",
      time: "2024-12-27T19:00:00",
    },
    {
      game: "Las Vegas Bowl",
      team1: "USC",
      team2: "Texas A&M",
      winner: "",
      date: "22",
      time: "2024-12-28T15:00:00",
    },
    {
      game: "Fenway Bowl",
      team1: "UConn",
      team2: "North Carolina",
      winner: "",
      date: "23",
      time: "2024-12-28T11:00:00",
    },
    {
      game: "Pinstripe Bowl",
      team1: "Boston College",
      team2: "Nebraska",
      winner: "",
      date: "24",
      time: "2024-12-28T19:00:00",
    },
    {
      game: "New Mexico Bowl",
      team1: "TCU",
      team2: "Louisiana",
      winner: "",
      date: "25",
      time: "2024-12-28T15:00:00",
    },
    {
      game: "Pop-Tarts Bowl",
      team1: "Miami",
      team2: "Iowa State",
      winner: "",
      date: "26",
      time: "2024-12-28T19:00:00",
    },
    {
      game: "Arizona Bowl",
      team1: "Colorado State",
      team2: "Miami (Ohio)",
      winner: "",
      date: "27",
      time: "2024-12-29T14:00:00",
    },
    {
      game: "Military Bowl",
      team1: "NC State",
      team2: "East Carolina",
      winner: "",
      date: "28",
      time: "2024-12-29T10:30:00",
    },
    {
      game: "Alamo Bowl",
      team1: "BYU",
      team2: "Colorado",
      winner: "",
      date: "29",
      time: "2024-12-29T19:00:00",
    },
    {
      game: "Independence Bowl",
      team1: "Army",
      team2: "Marshall",
      winner: "",
      date: "30",
      time: "2024-12-30T14:30:00", 
    },
    {
      game: "Music City Bowl",
      team1: "Missouri",
      team2: "Iowa",
      winner: "",
      date: "31",
      time: "2024-12-30T19:00:00",
    },
    {
      game: "ReliaQuest Bowl",
      team1: "Alabama",
      team2: "Michigan",
      winner: "",
      date: "32",
      time: "2024-12-31T13:00:00",
    },
    {
      game: "Sun Bowl",
      team1: "Louisville",
      team2: "Washington",
      winner: "",
      date: "33",
      time: "2024-12-31T15:30:00",
    },
    {
      game: "Citrus Bowl",
      team1: "South Carolina",
      team2: "Illinois",
      winner: "",
      date: "34",
      time: "2025-01-01T12:00:00",
    },
    {
      game: "Texas Bowl",
      team1: "LSU",
      team2: "Baylor",
      winner: "",
      date: "35",
      time: "2025-01-01T15:30:00",
    },
    {
      game: "Gator Bowl",
      team1: "Ole Miss",
      team2: "Duke",
      winner: "",
      date: "36",
      time: "2025-01-01T18:30:00",
    },
    {
      game: "First Responder Bowl",
      team1: "North Texas",
      team2: "Texas State",
      winner: "",
      date: "37",
      time: "2025-01-02T14:00:00",
    },
    {
      game: "Duke's Mayo Bowl",
      team1: "Minnesota",
      team2: "Virginia Tech",
      winner: "",
      date: "38",
      time: "2025-01-02T10:30:00",
    },
    {
      game: "Bahamas Bowl",
      team1: "Liberty",
      team2: "Buffalo",
      winner: "",
      date: "39",
      time: "2025-01-03T13:00:00",
    },
  ];
  
  export default gamesWithTimes;