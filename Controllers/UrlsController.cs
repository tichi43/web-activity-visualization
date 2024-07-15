using Microsoft.AspNetCore.Mvc;
using web_activity_visualization.Models;

namespace web_activity_visualization.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class UrlsController : ControllerBase
    {
        private readonly YourDbContext _context;

        public UrlsController(YourDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> PostUrlData([FromBody] List<UrlDto> urlDtos)
        {
            if (urlDtos == null)
            {
                return BadRequest("Invalid data");
            }

            foreach (var urlDto in urlDtos)
            {
                var url = new Url
                {
                    UrlString = urlDto.UrlString,
                    Anchors = urlDto.Anchors.Select(a => new Anchor
                    {
                        AnchorName = a.AnchorName,
                        TotalTime = a.TotalTime
                    }).ToList()
                };

                _context.Urls.Add(url);
            }

            await _context.SaveChangesAsync();

            return Ok("Data received and saved successfully");
        }
    }

}