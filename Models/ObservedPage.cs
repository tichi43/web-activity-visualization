using MongoDB.Bson;
using MongoDB.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace web_activity_visualization.Models
{

    public class Url
    {
        public int UrlId { get; set; }
        public string UrlString { get; set; }
        public List<Anchor> Anchors { get; set; } = new List<Anchor>();
    }

    public class Anchor
    {
        public int AnchorId { get; set; }
        public int UrlId { get; set; }
        public required string AnchorName { get; set; }
        public int TotalTime { get; set; }

        public Url Url { get; set; }
    }

    public class UrlDto
    {
        public required string UrlString { get; set; }
        public required List<AnchorDto> Anchors { get; set; }
    }

    public class AnchorDto
    {
        public required string AnchorName { get; set; }
        public required int TotalTime { get; set; }
    }


}
