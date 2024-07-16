using MongoDB.Bson;
using MongoDB.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace web_activity_visualization.Models;

    public class TrackedPage
    {
        public int TrackedPageId { get; set; }
        public required string PageUrl { get; set; }
        public List<Anchor> Anchors { get; set; } = new List<Anchor>();
    }

    public class Anchor
    {
        public int AnchorId { get; set; }
        public int TrackedPageId { get; set; }
        public required string AnchorName { get; set; }
        public int TotalTime { get; set; }

        public TrackedPage? TrackedPage { get; set; }
    }

    public class TrackedPageDto
    {
        public required string PageUrl { get; set; }
        public required List<AnchorDto> Anchors { get; set; }
    }

    public class AnchorDto
    {
        public required string AnchorName { get; set; }
        public int TotalTime { get; set; }
    }


