using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace wav_blazor.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TrackedPages",
                columns: table => new
                {
                    TrackedPageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackedPages", x => x.TrackedPageId);
                });

            migrationBuilder.CreateTable(
                name: "Anchors",
                columns: table => new
                {
                    AnchorId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrackedPageId = table.Column<int>(type: "int", nullable: false),
                    AnchorName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalTime = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Anchors", x => x.AnchorId);
                    table.ForeignKey(
                        name: "FK_Anchors_TrackedPages_TrackedPageId",
                        column: x => x.TrackedPageId,
                        principalTable: "TrackedPages",
                        principalColumn: "TrackedPageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Anchors_TrackedPageId",
                table: "Anchors",
                column: "TrackedPageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Anchors");

            migrationBuilder.DropTable(
                name: "TrackedPages");
        }
    }
}
