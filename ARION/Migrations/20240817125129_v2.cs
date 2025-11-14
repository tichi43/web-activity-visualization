using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARION.Migrations
{
    /// <inheritdoc />
    public partial class v2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDataCollectionActive",
                table: "TrackedPages",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHeatmapShown",
                table: "TrackedPages",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastUpdated",
                table: "TrackedPages",
                type: "datetime2",
                nullable: false,
                defaultValue: DateTime.Now);

            migrationBuilder.AddColumn<int>(
                name: "TotalPageViews",
                table: "TrackedPages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalViewTime",
                table: "TrackedPages",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDataCollectionActive",
                table: "TrackedPages");

            migrationBuilder.DropColumn(
                name: "IsHeatmapShown",
                table: "TrackedPages");

            migrationBuilder.DropColumn(
                name: "LastUpdated",
                table: "TrackedPages");

            migrationBuilder.DropColumn(
                name: "TotalPageViews",
                table: "TrackedPages");

            migrationBuilder.DropColumn(
                name: "TotalViewTime",
                table: "TrackedPages");
        }
    }
}
